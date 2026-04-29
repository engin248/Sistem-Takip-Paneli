// ============================================================
// LOCAL AUDIT — Değiştirilemez Denetim Kaydı
// HATA #4: Önceden auditLog tamamen boştu. Audit trail yoktu.
// ============================================================

import { appendFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

// Log dosyası — proje kökünden bağımsız, her zaman yazılabilir
const AUDIT_DIR  = join(process.cwd(), '..', 'Planlama_Departmani', 'audit_logs');
const AUDIT_FILE = join(AUDIT_DIR, 'audit_trail.log');
const MAX_LOG_BYTES = 10 * 1024 * 1024; // 10MB — rotasyon eşiği

export interface AuditKayit {
  islem: string;
  katman?: string;
  kullanici?: string;
  veri?: unknown;
  sonuc?: 'PASS' | 'FAIL' | 'WARN';
  aciklama?: string;
}

/**
 * auditLog — Değiştirilemez denetim kaydı yazar (tam F-007 uyumu).
 * HATA #4 DÜZELTİLDİ: Artık gerçekten dosyaya yazılıyor.
 * Rotasyon: 10MB aşılırsa yeni dosya açılır (log kaybolmaz).
 */
export function auditLog(kayit: AuditKayit): void {
  try {
    if (!existsSync(AUDIT_DIR)) {
      mkdirSync(AUDIT_DIR, { recursive: true });
    }

    const ts = new Date().toISOString();
    const satir = JSON.stringify({
      ts,
      islem:     kayit.islem,
      katman:    kayit.katman    || 'SİSTEM',
      kullanici: kayit.kullanici || 'OTONOM',
      sonuc:     kayit.sonuc     || 'PASS',
      aciklama:  kayit.aciklama  || '',
      veri:      kayit.veri      !== undefined ? JSON.stringify(kayit.veri).slice(0, 500) : null,
    });

    // Rotasyon kontrolü
    let dosyaAdi = AUDIT_FILE;
    try {
      const { statSync } = require('fs') as typeof import('fs');
      if (existsSync(AUDIT_FILE)) {
        const stat = statSync(AUDIT_FILE);
        if (stat.size > MAX_LOG_BYTES) {
          // Eski dosyayı yeniden adlandır
          const arsivAdi = AUDIT_FILE.replace('.log', `_${ts.replace(/[:.]/g, '-')}.log`);
          const { renameSync } = require('fs') as typeof import('fs');
          renameSync(AUDIT_FILE, arsivAdi);
          console.log(`[AUDIT] Log rotasyonu: ${arsivAdi}`);
        }
      }
    } catch { /* rotasyon hatası audit'i durdurmamalı */ }

    appendFileSync(dosyaAdi, satir + '\n', 'utf-8');
  } catch (e: any) {
    // Audit hatası sessizce konsola düşer — ana akışı bozmaz
    console.error(`[AUDIT HATA]: ${e.message}`);
  }
}

/**
 * auditOzet — Son N kaydı döndürür (API için)
 */
export function auditOzet(satirSayisi = 100): string[] {
  try {
    if (!existsSync(AUDIT_FILE)) return [];
    const { readFileSync } = require('fs') as typeof import('fs');
    const icerik = readFileSync(AUDIT_FILE, 'utf-8');
    const satirlar = icerik.trim().split('\n').filter(Boolean);
    return satirlar.slice(-satirSayisi);
  } catch {
    return [];
  }
}
