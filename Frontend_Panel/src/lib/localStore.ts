// ============================================================
// LOCAL STORE — Yerel-Önce (Local-First) Veri Katmanı
// ============================================================
// MİMARİ:
//   1. Tüm okuma/yazma → yerel JSON dosya (anlık, limitsiz)
//   2. Memory cache   → tekrar okuma gerektirmez
//   3. Supabase       → sadece syncToSupabase() çağrıldığında
//
// AVANTAJLAR:
//   - Supabase limit yok
//   - İnternet kesilince sistem çalışmaya devam eder
//   - Anlık hız (disk I/O, ağ yok)
//   - Arşiv/yedek isteğe bağlı
// ============================================================

import * as fs from 'fs';
import * as path from 'path';

// ─── STORE DOSYA YOLU ────────────────────────────────────────
// Next.js root'undan bir üst dizin: Sistem-Takip-Paneli/data/
const DATA_DIR = path.join(process.cwd(), '..', 'data');
const STORE_FILES = {
  agents:          path.join(DATA_DIR, 'agents.json'),
  tasks:           path.join(DATA_DIR, 'tasks.json'),
  audit_logs:      path.join(DATA_DIR, 'audit_logs.json'),
  sync_log:        path.join(DATA_DIR, 'sync_log.json'),
  gorev_kartlari:  path.join(DATA_DIR, 'gorev_kartlari.json'),
} as const;

type StoreKey = keyof typeof STORE_FILES;

// ─── MEMORY CACHE ────────────────────────────────────────────
const _cache = new Map<StoreKey, unknown[]>();
let _dirReady = false;

function ensureDir() {
  if (_dirReady) return;
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  _dirReady = true;
}

// ─── OKUMA ───────────────────────────────────────────────────
export function localRead<T = Record<string, unknown>>(key: StoreKey): T[] {
  if (_cache.has(key)) return _cache.get(key) as T[];
  ensureDir();
  const file = STORE_FILES[key];
  if (!fs.existsSync(file)) {
    _cache.set(key, []);
    return [];
  }
  try {
    const raw = fs.readFileSync(file, 'utf-8');
    const data = JSON.parse(raw) as T[];
    _cache.set(key, data);
    return data;
  } catch {
    return [];
  }
}

// ─── YAZMA ───────────────────────────────────────────────────
function _persist(key: StoreKey, data: unknown[]) {
  ensureDir();
  _cache.set(key, data);
  fs.writeFileSync(STORE_FILES[key], JSON.stringify(data, null, 2), 'utf-8');
}

// ─── EKLEME ──────────────────────────────────────────────────
export function localInsert<T extends Record<string, unknown>>(key: StoreKey, item: T): T {
  const list = localRead(key);
  const newItem = {
    ...item,
    _local_id: item._local_id || `${key}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
    _synced: false,
    created_at: item.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as T;
  _persist(key, [...list, newItem]);
  return newItem;
}

// ─── GÜNCELLEME ──────────────────────────────────────────────
export function localUpdate<T extends Record<string, unknown>>(
  key: StoreKey,
  id: string,
  changes: Partial<T>
): T | null {
  const list = localRead<T>(key);
  let updated: T | null = null;
  const newList = list.map(item => {
    if ((item as Record<string, unknown>).id === id) {
      updated = { ...item, ...changes, _synced: false, updated_at: new Date().toISOString() } as T;
      return updated;
    }
    return item;
  });
  if (updated) _persist(key, newList);
  return updated;
}

// ─── SİLME ───────────────────────────────────────────────────
export function localDelete(key: StoreKey, id: string): boolean {
  const list = localRead(key);
  const before = list.length;
  const newList = list.filter(item => (item as Record<string, unknown>).id !== id);
  if (newList.length < before) {
    _persist(key, newList);
    return true;
  }
  return false;
}

// ─── CACHE TEMIZLE (zorla yeniden oku) ───────────────────────
export function invalidateCache(key: StoreKey) {
  _cache.delete(key);
}

// ─── SUPABASE SYNC ───────────────────────────────────────────
// Sadece bu fonksiyon çağrıldığında Supabase'e yazılır.
// syncOnly = belirli bir key, undefined = hepsi
export async function syncToSupabase(syncKey?: StoreKey): Promise<{
  synced: number; failed: number; details: string[];
}> {
  const keys = syncKey ? [syncKey] : (['agents', 'tasks', 'audit_logs'] as StoreKey[]);
  let synced = 0; let failed = 0; const details: string[] = [];

  // Supabase client — sadece sync sırasında import edilir
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );

  for (const key of keys) {
    const items = localRead(key).filter(
      item => !(item as Record<string, unknown>)._synced
    );
    if (items.length === 0) {
      details.push(`[${key}] Zaten senkronize — atlandı`);
      continue;
    }

    // _local_id ve _synced alanlarını çıkar (Supabase bilmez)
    const clean = items.map(item => {
      const { _local_id, _synced, ...rest } = item as Record<string, unknown>;
      void _local_id; void _synced;
      return rest;
    });

    const { error } = await supabase.from(key).upsert(clean, { onConflict: 'id' });
    if (error) {
      failed += items.length;
      details.push(`[${key}] HATA: ${error.message}`);
    } else {
      // Yerel kayıtları _synced=true olarak işaretle
      const list = localRead(key);
      const marked = list.map(item => {
        const rec = item as Record<string, unknown>;
        const inBatch = items.some(b => (b as Record<string, unknown>).id === rec.id);
        return inBatch ? { ...rec, _synced: true } : rec;
      });
      _persist(key, marked);
      synced += items.length;
      details.push(`[${key}] ${items.length} kayıt Supabase'e gönderildi ✅`);
    }
  }

  // Sync logunu güncelle
  const syncEntry = {
    id: `sync_${Date.now()}`,
    timestamp: new Date().toISOString(),
    synced, failed, details,
  };
  const logs = localRead('sync_log');
  _persist('sync_log', [...logs.slice(-99), syncEntry]); // Son 100 log

  return { synced, failed, details };
}

// ─── SYNC DURUMU ─────────────────────────────────────────────
export function getSyncStatus(): {
  pending: Record<StoreKey, number>;
  lastSync: string | null;
} {
  const pending: Partial<Record<StoreKey, number>> = {};
  const keys: StoreKey[] = ['agents', 'tasks', 'audit_logs'];

  for (const key of keys) {
    const items = localRead(key);
    pending[key] = items.filter(i => !(i as Record<string, unknown>)._synced).length;
  }

  const logs = localRead('sync_log');
  const lastLog = logs[logs.length - 1] as Record<string, unknown> | undefined;

  return {
    pending: pending as Record<StoreKey, number>,
    lastSync: (lastLog?.timestamp as string) || null,
  };
}
