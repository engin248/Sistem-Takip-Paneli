// ============================================================
// TABLO HARİTASI — SİSTEM İZLENEBİLİRLİK KAYDI
// ============================================================
// Her tablonun hangi dosya(lar) tarafından yönetildiğini tanımlar.
// Kaynak: Canlı grep taraması (08.04.2026)
// Doktrin: Bu dosya dışında hiçbir tablo erişimi YAPILMAZ.
// ============================================================

// ─── TABLO ERİŞİM TİPLERİ ────────────────────────────────────
export type TableOperation = 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'REALTIME';

// ─── TABLO GİRİŞ YAPISI ──────────────────────────────────────
export interface TableEntry {
  /** Supabase tablo adı */
  table: string;
  /** Bu tabloyu yöneten dosya yolu */
  managedBy: string;
  /** Yapılan işlem tipleri */
  operations: TableOperation[];
  /** Erişim türü: doğrudan (.from) veya dolaylı (servis zinciri) */
  accessType: 'DOGRUDAN' | 'DOLAYLI';
  /** Proje: STP veya SKM */
  project: 'STP' | 'SKM';
}

// ─── AKTİF TABLO HARİTASI ────────────────────────────────────
// Kod tarafından yönetilen tüm tablolar.
// ──────────────────────────────────────────────────────────────
export const TABLE_MAP: readonly TableEntry[] = [

  // ═══════════════════════════════════════════════════════════
  // PROJE: STP (Sistem Takip Paneli)
  // Konum: c:\sistem_takip_paneli\02_is_alani
  // ═══════════════════════════════════════════════════════════

  // ── tasks tablosu ──────────────────────────────────────────
  { table: 'tasks', managedBy: 'src/services/taskService.ts',   operations: ['SELECT', 'UPDATE', 'DELETE', 'REALTIME'],  accessType: 'DOGRUDAN', project: 'STP' },
  { table: 'tasks', managedBy: 'src/components/TaskForm.tsx',   operations: ['INSERT'],                                   accessType: 'DOGRUDAN', project: 'STP' },
  { table: 'tasks', managedBy: 'src/components/TaskCard.tsx',   operations: ['UPDATE', 'DELETE'],                          accessType: 'DOLAYLI',  project: 'STP' },
  { table: 'tasks', managedBy: 'src/app/page.tsx',              operations: ['SELECT', 'REALTIME'],                        accessType: 'DOLAYLI',  project: 'STP' },
  { table: 'tasks', managedBy: 'src/store/useTaskStore.ts',     operations: ['SELECT'],                                    accessType: 'DOLAYLI',  project: 'STP' },
  { table: 'tasks', managedBy: 'src/services/exportService.ts', operations: ['SELECT'],                                    accessType: 'DOLAYLI',  project: 'STP' },
  { table: 'tasks', managedBy: 'src/components/Stats.tsx',      operations: ['SELECT'],                                    accessType: 'DOLAYLI',  project: 'STP' },

  // ── audit_logs tablosu ─────────────────────────────────────
  { table: 'audit_logs', managedBy: 'src/services/auditService.ts', operations: ['INSERT', 'SELECT'],     accessType: 'DOGRUDAN', project: 'STP' },
  { table: 'audit_logs', managedBy: 'src/components/AuditLog.tsx',  operations: ['SELECT', 'REALTIME'],   accessType: 'DOGRUDAN', project: 'STP' },
  { table: 'audit_logs', managedBy: 'src/services/taskService.ts',  operations: ['INSERT'],               accessType: 'DOLAYLI',  project: 'STP' },
  { table: 'audit_logs', managedBy: 'src/lib/errorHandler.ts',      operations: ['INSERT'],               accessType: 'DOLAYLI',  project: 'STP' },
  { table: 'audit_logs', managedBy: 'src/components/TaskForm.tsx',  operations: ['INSERT'],               accessType: 'DOLAYLI',  project: 'STP' },
  { table: 'audit_logs', managedBy: 'src/services/exportService.ts',operations: ['INSERT'],               accessType: 'DOLAYLI',  project: 'STP' },
  { table: 'audit_logs', managedBy: 'src/app/page.tsx',             operations: ['SELECT'],               accessType: 'DOLAYLI',  project: 'STP' },

  // ═══════════════════════════════════════════════════════════
  // PROJE: SKM (Sistem Kontrol Merkezi)
  // Konum: c:\Users\Esisya\Desktop\sistem-kontrol-merkezi
  // ═══════════════════════════════════════════════════════════

  // ── skm_sistemler tablosu ──────────────────────────────────
  { table: 'skm_sistemler',       managedBy: 'src/app/page.tsx',                    operations: ['SELECT'],                   accessType: 'DOGRUDAN', project: 'SKM' },
  { table: 'skm_sistemler',       managedBy: 'src/app/api/health-check/route.ts',   operations: ['SELECT', 'UPDATE'],         accessType: 'DOGRUDAN', project: 'SKM' },

  // ── skm_saglik_kayitlari tablosu ───────────────────────────
  { table: 'skm_saglik_kayitlari', managedBy: 'src/app/api/health-check/route.ts',  operations: ['INSERT'],                   accessType: 'DOGRUDAN', project: 'SKM' },

  // ── skm_olaylar tablosu ────────────────────────────────────
  { table: 'skm_olaylar',         managedBy: 'src/lib/skm.ts',                      operations: ['INSERT', 'SELECT'],         accessType: 'DOGRUDAN', project: 'SKM' },
  { table: 'skm_olaylar',         managedBy: 'src/app/page.tsx',                    operations: ['REALTIME'],                 accessType: 'DOGRUDAN', project: 'SKM' },

  // ── skm_cift_kontrol tablosu ───────────────────────────────
  { table: 'skm_cift_kontrol',    managedBy: 'src/lib/skm.ts',                      operations: ['INSERT', 'SELECT', 'UPDATE'], accessType: 'DOGRUDAN', project: 'SKM' },

  // ── skm_alarmlar tablosu ───────────────────────────────────
  { table: 'skm_alarmlar',        managedBy: 'src/lib/skm.ts',                      operations: ['INSERT', 'SELECT', 'UPDATE'], accessType: 'DOGRUDAN', project: 'SKM' },
  { table: 'skm_alarmlar',        managedBy: 'src/app/page.tsx',                    operations: ['REALTIME'],                 accessType: 'DOGRUDAN', project: 'SKM' },

  // ── gorevler tablosu ───────────────────────────────────────
  { table: 'gorevler',            managedBy: 'src/lib/gorev-motoru.ts',              operations: ['INSERT', 'SELECT', 'UPDATE'], accessType: 'DOGRUDAN', project: 'SKM' },

  // ── gorev_kanitlar tablosu ─────────────────────────────────
  { table: 'gorev_kanitlar',      managedBy: 'src/lib/gorev-motoru.ts',              operations: ['INSERT', 'SELECT'],         accessType: 'DOGRUDAN', project: 'SKM' },

  // ── gorev_loglar tablosu ───────────────────────────────────
  { table: 'gorev_loglar',        managedBy: 'src/lib/gorev-motoru.ts',              operations: ['INSERT', 'SELECT'],         accessType: 'DOGRUDAN', project: 'SKM' },

  // ── audit_logs (SKM tarafı) ────────────────────────────────
  { table: 'audit_logs',          managedBy: 'src/services/audit.ts',                operations: ['INSERT', 'SELECT'],         accessType: 'DOGRUDAN', project: 'SKM' },
  { table: 'audit_logs',          managedBy: 'src/app/api/audit-test/route.ts',      operations: ['INSERT', 'SELECT'],         accessType: 'DOGRUDAN', project: 'SKM' },
  { table: 'audit_logs',          managedBy: 'src/app/page.tsx',                     operations: ['REALTIME'],                 accessType: 'DOGRUDAN', project: 'SKM' },

] as const;

// ─── YARDIMCI FONKSİYONLAR ───────────────────────────────────

/** Belirli bir tabloya erişen tüm dosyaları getir */
export function getFilesByTable(tableName: string): TableEntry[] {
  return TABLE_MAP.filter(e => e.table === tableName);
}

/** Belirli bir dosyanın eriştiği tüm tabloları getir */
export function getTablesByFile(filePath: string): TableEntry[] {
  return TABLE_MAP.filter(e => e.managedBy === filePath);
}

/** Benzersiz tablo isimlerini getir */
export function getUniqueTables(): string[] {
  return [...new Set(TABLE_MAP.map(e => e.table))];
}

/** Benzersiz dosya yollarını getir */
export function getUniqueFiles(): string[] {
  return [...new Set(TABLE_MAP.map(e => e.managedBy))];
}

/** Projeye göre filtrele */
export function getByProject(project: 'STP' | 'SKM'): TableEntry[] {
  return TABLE_MAP.filter(e => e.project === project);
}

/** Doğrudan erişimleri getir */
export function getDirectAccess(): TableEntry[] {
  return TABLE_MAP.filter(e => e.accessType === 'DOGRUDAN');
}

/** Özet istatistik */
export function getMapStats(): {
  totalEntries: number;
  uniqueTables: number;
  uniqueFiles: number;
  stpEntries: number;
  skmEntries: number;
  directEntries: number;
  indirectEntries: number;
} {
  return {
    totalEntries: TABLE_MAP.length,
    uniqueTables: getUniqueTables().length,
    uniqueFiles: getUniqueFiles().length,
    stpEntries: getByProject('STP').length,
    skmEntries: getByProject('SKM').length,
    directEntries: getDirectAccess().length,
    indirectEntries: TABLE_MAP.filter(e => e.accessType === 'DOLAYLI').length,
  };
}
