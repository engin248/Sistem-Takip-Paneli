// src/core/localAudit.ts
// ============================================================
// LOCAL AUDIT — SHA-256 DAMGALI, ZİNCİRLİ, DEĞİŞTİRİLEMEZ LOG
// ============================================================
// Her kayıt önceki kaydın hash'ini içerir → zincir bozulursa
// doğrulama FAIL döner. Manipülasyon tespiti garantili.
// ============================================================

import fs   from 'fs';
import path from 'path';
import { createHash } from 'crypto';

// ── YAPILANDIRMA ─────────────────────────────────────────────
const LOG_DIR  = process.env.AUDIT_LOG_DIR ||
  path.join(process.cwd(), '.agent_audit');
const LOG_FILE = path.join(LOG_DIR, 'audit_chain.jsonl');
const LOCK_FILE = path.join(LOG_DIR, '.lock');

// ── LOG KAYIT TİPİ ────────────────────────────────────────────
export interface AuditEntry {
  seq          : number;        // Sıra numarası
  timestamp    : string;        // ISO zaman damgası
  agent_id     : string;        // Hangi ajan
  action       : string;        // Ne yapıldı
  data         : unknown;       // İş verisi
  hash         : string;        // Bu kaydın SHA-256 hash'i
  prev_hash    : string;        // Önceki kaydın hash'i (zincir)
  integrity    : 'OK' | 'FAIL'; // Bütünlük durumu
}

// ── HASH ÜRETICI ─────────────────────────────────────────────
function computeHash(entry: Omit<AuditEntry, 'hash' | 'integrity'>): string {
  const content = JSON.stringify(entry);
  return createHash('sha256').update(content).digest('hex');
}

// ── DOSYA BAşLAT ─────────────────────────────────────────────
function ensureLogDir(): void {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

// ── SON KAYDI OKU ─────────────────────────────────────────────
function readLastEntry(): AuditEntry | null {
  if (!fs.existsSync(LOG_FILE)) return null;
  const lines = fs.readFileSync(LOG_FILE, 'utf-8')
    .split('\n').filter(l => l.trim());
  if (lines.length === 0) return null;
  try {
    return JSON.parse(lines[lines.length - 1]!) as AuditEntry;
  } catch { return null; }
}

// ── DOSYA KİLİDİ (Concurrent yazma koruması) ─────────────────
function acquireLock(retries = 5, delayMs = 50): boolean {
  for (let i = 0; i < retries; i++) {
    try {
      // O_EXCL: Dosya zaten varsa hata verir — atomik kilit
      fs.writeFileSync(LOCK_FILE, String(process.pid), { flag: 'wx' });
      return true;
    } catch {
      // Kilit başkasında — bekle
      const start = Date.now();
      while (Date.now() - start < delayMs) { /* busy wait */ }
    }
  }
  return false;
}

function releaseLock(): void {
  try { fs.unlinkSync(LOCK_FILE); } catch { /* zaten yok */ }
}

// ── KAYIT YAZ ─────────────────────────────────────────────────
export function auditLog(
  agent_id: string,
  action  : string,
  data    : unknown
): AuditEntry {
  ensureLogDir();

  // Kilit al — concurrent yazma koruması
  const locked = acquireLock();
  try {
    const last    = readLastEntry();
    const seq     = (last?.seq ?? 0) + 1;
    const prevHash = last?.hash ?? '0'.repeat(64);

    const base: Omit<AuditEntry, 'hash' | 'integrity'> = {
      seq,
      timestamp : new Date().toISOString(),
      agent_id,
      action,
      data,
      prev_hash : prevHash,
    };

    const hash = computeHash(base);

    const entry: AuditEntry = { ...base, hash, integrity: 'OK' };

    fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n', 'utf-8');
    return entry;
  } finally {
    if (locked) releaseLock();
  }
}

// ── ZİNCİR DOĞRULAMA ─────────────────────────────────────────
export interface VerifyResult {
  toplam        : number;
  gecerli       : number;
  bozuk         : number;
  bozuk_satirlar: number[];
  durum         : 'GUVENLI' | 'TEHLIKE';
}

export function verifyChain(): VerifyResult {
  if (!fs.existsSync(LOG_FILE)) {
    return { toplam:0, gecerli:0, bozuk:0, bozuk_satirlar:[], durum:'GUVENLI' };
  }

  const lines = fs.readFileSync(LOG_FILE, 'utf-8')
    .split('\n').filter(l => l.trim());

  let gecerli  = 0;
  let bozuk    = 0;
  const bozukSatirlar: number[] = [];
  let oncekiHash = '0'.repeat(64);

  for (let i = 0; i < lines.length; i++) {
    try {
      const entry = JSON.parse(lines[i]!) as AuditEntry;
      const { hash, integrity, ...base } = entry;
      void integrity;

      // Hash doğrula
      const beklenen = computeHash(base);
      const zincirOk = entry.prev_hash === oncekiHash;
      const hashOk   = hash === beklenen;

      if (hashOk && zincirOk) {
        gecerli++;
      } else {
        bozuk++;
        bozukSatirlar.push(i + 1);
      }
      oncekiHash = hash;
    } catch {
      bozuk++;
      bozukSatirlar.push(i + 1);
    }
  }

  return {
    toplam  : lines.length,
    gecerli,
    bozuk,
    bozuk_satirlar: bozukSatirlar,
    durum   : bozuk === 0 ? 'GUVENLI' : 'TEHLIKE',
  };
}

// ── SON N KAYDI OKU ──────────────────────────────────────────
export function readRecentEntries(n = 20): AuditEntry[] {
  if (!fs.existsSync(LOG_FILE)) return [];
  const lines = fs.readFileSync(LOG_FILE, 'utf-8')
    .split('\n').filter(l => l.trim());
  return lines
    .slice(-n)
    .map(l => { try { return JSON.parse(l) as AuditEntry; } catch { return null; } })
    .filter((e): e is AuditEntry => e !== null)
    .reverse();
}
