// src/core/agentMemory.ts
// ============================================================
// AJAN UZUN DÖNEM HAFIZASI (LTM)
// ============================================================
// Her ajan kendi hafıza dosyasını tutar:
//   - Başarılı görev kalıpları (pattern store)
//   - Öğrenilen bilgiler (knowledge store)
//   - Hata geçmişi (error store) — tekrar etmesin
//
// Depolama: JSONL dosya (MEMORY_DIR/agent_<id>.jsonl)
// Sorgu: keyword benzerlik skoru
// TTL: Yok — kalıcı (zaman damgası var)
// ============================================================

import fs   from 'fs';
import path from 'path';
import crypto from 'crypto';

// ── YAPILANDIRMA ─────────────────────────────────────────────
const MEMORY_DIR  = process.env.AGENT_MEMORY_DIR
  ?? path.join(process.cwd(), '.agent_memory');
const MAX_MEMORIES = 200; // ajan başına max kayıt

if (!fs.existsSync(MEMORY_DIR)) {
  try { fs.mkdirSync(MEMORY_DIR, { recursive: true }); } catch { /* izin yoksa atla */ }
}

// ── TİPLER ────────────────────────────────────────────────────
export type MemoryTipi = 'KALIP' | 'BILGI' | 'HATA' | 'STRATEJI';

export interface MemoryEntry {
  id        : string;          // SHA-256 kısalt
  agent_id  : string;
  tip       : MemoryTipi;
  gorev_ozet: string;          // Görevin özeti (max 200 kar)
  ogreni    : string;          // Öğrenilen bilgi / kalıp / strateji
  keywords  : string[];        // Hızlı arama için
  skor      : number;          // Bu hafızanın güven skoru (0-100)
  kullanim  : number;          // Kaç kez kullanıldı
  ts        : string;          // ISO zaman
}

export interface MemoryQuerySonuc {
  girdi     : string;
  bulunan   : MemoryEntry[];
  baglam    : string;          // AI'ya enjekte edilecek özet metin
}

// ── YARDIMCI ─────────────────────────────────────────────────
function memoryFile(agent_id: string): string {
  return path.join(MEMORY_DIR, `agent_${agent_id.replace(/[^a-zA-Z0-9-]/g, '_')}.jsonl`);
}

function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s,.\-_:;!?()[\]{}\/\\]+/)
    .filter(k => k.length > 2 && k.length < 30)
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 15);
}

function benzerlikSkoru(entry: MemoryEntry, keywords: string[]): number {
  let skor = 0;
  for (const kw of keywords) {
    if (entry.keywords.includes(kw)) skor += 3;
    if (entry.gorev_ozet.toLowerCase().includes(kw)) skor += 2;
    if (entry.ogreni.toLowerCase().includes(kw)) skor += 1;
  }
  return skor;
}

// ── OKUMA ─────────────────────────────────────────────────────
export function readMemories(agent_id: string): MemoryEntry[] {
  const fp = memoryFile(agent_id);
  if (!fs.existsSync(fp)) return [];
  try {
    return fs.readFileSync(fp, 'utf-8')
      .split('\n')
      .filter(l => l.trim())
      .map(l => JSON.parse(l) as MemoryEntry);
  } catch { return []; }
}

// ── YAZMA ─────────────────────────────────────────────────────
export function writeMemory(agent_id: string, entry: Omit<MemoryEntry, 'id' | 'ts' | 'kullanim'>): void {
  const fp  = memoryFile(agent_id);
  const full: MemoryEntry = {
    ...entry,
    id      : crypto.randomBytes(6).toString('hex'),
    ts      : new Date().toISOString(),
    kullanim: 0,
  };

  const existing = readMemories(agent_id);

  // Trim — MAX_MEMORIES aştıysa en eskiyi at
  const trimmed = existing.length >= MAX_MEMORIES
    ? existing.slice(existing.length - MAX_MEMORIES + 1)
    : existing;

  trimmed.push(full);

  try {
    fs.writeFileSync(fp, trimmed.map(e => JSON.stringify(e)).join('\n') + '\n', 'utf-8');
  } catch { /* yazma hatası → sessizce geç */ }
}

// ── SORGU ─────────────────────────────────────────────────────
export function queryMemory(agent_id: string, sorgu: string, maxSonuc = 3): MemoryQuerySonuc {
  const keywords  = extractKeywords(sorgu);
  const memories  = readMemories(agent_id);

  if (memories.length === 0) {
    return { girdi: sorgu, bulunan: [], baglam: '' };
  }

  const puanli = memories
    .map(e => ({ e, puan: benzerlikSkoru(e, keywords) }))
    .filter(x => x.puan > 0)
    .sort((a, b) => b.puan - a.puan)
    .slice(0, maxSonuc)
    .map(x => x.e);

  if (puanli.length === 0) {
    return { girdi: sorgu, bulunan: [], baglam: '' };
  }

  // Kullanım sayacını güncelle
  const updatedMemories = memories.map(e => {
    const bulundu = puanli.find(p => p.id === e.id);
    return bulundu ? { ...e, kullanim: e.kullanim + 1 } : e;
  });
  try {
    const fp = memoryFile(agent_id);
    fs.writeFileSync(fp, updatedMemories.map(e => JSON.stringify(e)).join('\n') + '\n', 'utf-8');
  } catch { /* devam */ }

  // Bağlam metni oluştur
  const baglamParcalari = puanli.map((e, i) =>
    `[HAFIZA-${i + 1} | ${e.tip} | güven:${e.skor}%]\n${e.ogreni}`
  );

  const baglam = puanli.length > 0
    ? `\n\nAJAN HAFIZASINDAN (geçmiş deneyim):\n${baglamParcalari.join('\n---\n')}\n\nBu geçmiş deneyimleri kullan. Aynı hatayı tekrar etme.`
    : '';

  return { girdi: sorgu, bulunan: puanli, baglam };
}

// ── BAŞARI SONRASI ÖĞRENME ─────────────────────────────────────
export function ogrenimKaydet(
  agent_id : string,
  gorev    : string,
  sonuc    : string,
  tip      : MemoryTipi = 'KALIP',
  skor     : number = 80,
): void {
  const gorev_ozet = gorev.slice(0, 200);
  const ogreni     = sonuc.slice(0, 500);
  const keywords   = [
    ...extractKeywords(gorev_ozet),
    ...extractKeywords(ogreni),
  ].filter((v, i, a) => a.indexOf(v) === i).slice(0, 20);

  writeMemory(agent_id, { agent_id, tip, gorev_ozet, ogreni, keywords, skor });
}

// ── İSTATİSTİK ────────────────────────────────────────────────
export interface MemoryStats {
  toplam     : number;
  tip_dagilim: Record<MemoryTipi, number>;
  en_kullanilan: MemoryEntry | null;
  son_kayit  : string | null;
}

export function getMemoryStats(agent_id: string): MemoryStats {
  const memories = readMemories(agent_id);
  const tip_dagilim: Record<MemoryTipi, number> = {
    KALIP: 0, BILGI: 0, HATA: 0, STRATEJI: 0,
  };
  for (const m of memories) {
    tip_dagilim[m.tip] = (tip_dagilim[m.tip] ?? 0) + 1;
  }
  const enKullanilan = memories.reduce<MemoryEntry | null>(
    (max, m) => (!max || m.kullanim > max.kullanim) ? m : max, null
  );
  return {
    toplam      : memories.length,
    tip_dagilim,
    en_kullanilan: enKullanilan,
    son_kayit   : memories.at(-1)?.ts ?? null,
  };
}

// ── HATA ÖĞRENME (Aynı hatayı tekrar etme) ────────────────────
export function hataKaydet(
  agent_id : string,
  gorev    : string,
  hata     : string,
): void {
  writeMemory(agent_id, {
    agent_id,
    tip      : 'HATA',
    gorev_ozet: gorev.slice(0, 200),
    ogreni   : `HATA: ${hata.slice(0, 400)}\nBU YAKLAŞIMDAN KAÇIN.`,
    keywords : extractKeywords(gorev + ' ' + hata),
    skor     : 95, // Hata kayıtları yüksek güven
  });
}
