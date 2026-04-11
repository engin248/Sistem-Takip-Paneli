// ============================================================
// ERR-STP001 — MERKEZİ HATA MOTORU
// ============================================================
// Tüm sistemdeki hata kodlarını tanımlar ve tek noktadan yönetir.
// Her Supabase işlemi bu motorun ERR kodlarını KULLANMAK ZORUNDADIR.
// Jenerik metin mesajları YASAKTIR.
// ============================================================
// Format: ERR-STP001-XXX
//   STP001 = Sistem Takip Paneli Modül 1
//   XXX    = 001–999 arası benzersiz hata numarası
// ============================================================

// ─── HATA KODU KAYIT DEFTERİ ─────────────────────────────────
export const ERR = {
  // ── GENEL SİSTEM (001–009) ──────────────────────────────────
  SYSTEM_GENERAL:        'ERR-STP001-001',
  DB_CONNECTION:         'ERR-STP001-002',

  // ── GÖREV İŞLEMLERİ (003–009) ──────────────────────────────
  TASK_FETCH:            'ERR-STP001-003',
  TASK_UPDATE:           'ERR-STP001-004',
  TASK_DELETE:           'ERR-STP001-005',
  TASK_CREATE:           'ERR-STP001-010',
  TASK_CREATE_GENERAL:   'ERR-STP001-011',
  TASK_ARCHIVE:          'ERR-STP001-008',
  TASK_REALTIME:         'ERR-STP001-009',

  // ── AUDIT LOG İŞLEMLERİ (006–007, 017) ─────────────────────
  AUDIT_WRITE:           'ERR-STP001-006',
  AUDIT_READ:            'ERR-STP001-007',
  AUDIT_REALTIME:        'ERR-STP001-017',

  // ── EXPORT / MÜHÜRLEME (012) ───────────────────────────────
  SYSTEM_EXPORT:         'ERR-STP001-012',

  // ── BAĞLANTI DOĞRULAMA (013) ───────────────────────────────
  CONNECTION_INVALID:    'ERR-STP001-013',

  // ── AI / TELEGRAM İŞLEMLERİ (014–016) ─────────────────────
  AI_ANALYSIS:           'ERR-STP001-014',
  AI_CONNECTION:         'ERR-STP001-015',
  TELEGRAM_SEND:         'ERR-STP001-016',

  // ── YÖNETİM KURULU / KONSENSÜS (018–022) ──────────────────
  BOARD_CREATE:          'ERR-STP001-018',
  BOARD_FETCH:           'ERR-STP001-019',
  BOARD_VOTE:            'ERR-STP001-020',
  BOARD_CONSENSUS:       'ERR-STP001-021',
  BOARD_SEAL:            'ERR-STP001-022',

  // ── DOSYA KİLİTLEME / YETKİ (023–025) ─────────────────────
  PERMISSION_DENIED:     'ERR-STP001-023',
  OWNERSHIP_VERIFY:      'ERR-STP001-024',
  LOCK_VIOLATION:        'ERR-STP001-025',

  // ── BROWSER KONTROL (026–028) ──────────────────────────────
  BROWSER_LAUNCH:        'ERR-STP001-026',
  BROWSER_NAVIGATE:      'ERR-STP001-027',
  BROWSER_EXTRACT:       'ERR-STP001-028',

  // ── KÖPRÜ / SAĞLIK / ALARM (030–034) ───────────────────────
  BRIDGE_CONNECTION:     'ERR-STP001-030',
  BRIDGE_QUERY:          'ERR-STP001-031',
  HEALTH_CHECK:          'ERR-STP001-032',
  ALARM_CREATE:          'ERR-STP001-033',
  ALARM_UPDATE:          'ERR-STP001-034',

  // ── ACİL DURUM — TANIMLANAMAYAN ÇÖKME (999) ────────────────
  UNIDENTIFIED_COLLAPSE: 'ERR-STP001-999',
} as const;

export type ErrorCode = typeof ERR[keyof typeof ERR];

// ─── HATA AÇIKLAMA HARİTASI ──────────────────────────────────
export const ERR_DESCRIPTIONS: Record<ErrorCode, string> = {
  'ERR-STP001-001': 'Genel sistem hatası',
  'ERR-STP001-002': 'Veritabanı bağlantı hatası',
  'ERR-STP001-003': 'Görev listesi çekilemedi',
  'ERR-STP001-004': 'Görev durumu güncellenemedi',
  'ERR-STP001-005': 'Görev silinemedi',
  'ERR-STP001-006': 'Audit log yazılamadı',
  'ERR-STP001-007': 'Audit log okunamadı',
  'ERR-STP001-008': 'Görev arşivlenemedi',
  'ERR-STP001-009': 'Realtime kanal açılamadı',
  'ERR-STP001-010': 'Görev oluşturulamadı (Supabase)',
  'ERR-STP001-011': 'Görev oluşturulamadı (Genel)',
  'ERR-STP001-012': 'Sistem verisi dışa aktarılamadı',
  'ERR-STP001-013': 'Supabase bağlantı bilgileri eksik/geçersiz',
  'ERR-STP001-014': 'AI görev analizi başarısız',
  'ERR-STP001-015': 'OpenAI API bağlantı hatası',
  'ERR-STP001-016': 'Telegram mesaj gönderilemedi',
  'ERR-STP001-017': 'Audit log realtime kanalı açılamadı',
  'ERR-STP001-018': 'Kurul kararı oluşturulamadı',
  'ERR-STP001-019': 'Kurul kararları çekilemedi',
  'ERR-STP001-020': 'AI ajan oyu kaydedilemedi',
  'ERR-STP001-021': 'Konsensüs hesaplaması başarısız',
  'ERR-STP001-022': 'Kurul mühürü uygulanamadı',
  'ERR-STP001-023': 'Yazma yetkisi reddedildi — dosya kilidi aktif',
  'ERR-STP001-024': 'Görev sahipliği doğrulanamadı',
  'ERR-STP001-025': 'Dosya kilit ihlali tespit edildi',
  'ERR-STP001-026': 'Tarayıcı başlatılamadı (Playwright)',
  'ERR-STP001-027': 'Sayfa navigasyonu başarısız',
  'ERR-STP001-028': 'Sayfa içerik çıkarma hatası',
  'ERR-STP001-030': 'Dış sistem köprü bağlantısı başarısız',
  'ERR-STP001-031': 'Dış sistem sorgusu başarısız',
  'ERR-STP001-032': 'Sağlık kontrolü başarısız',
  'ERR-STP001-033': 'Alarm oluşturulamadı',
  'ERR-STP001-034': 'Alarm durumu güncellenemedi',
  'ERR-STP001-999': 'TABLO ÇÖKMESI — TANIMLANAMAYAN HATA',
};

// ─── SEVİYE TANIMLARI ────────────────────────────────────────
export type ErrorSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL' | 'FATAL';

// ─── SİSTEMİK HATA SINIFI ───────────────────────────────────
export class SystemError extends Error {
  public readonly code: ErrorCode;
  public readonly severity: ErrorSeverity;
  public readonly timestamp: string;
  public readonly context: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    context: Record<string, unknown> = {},
    severity: ErrorSeverity = 'ERROR'
  ) {
    const description = ERR_DESCRIPTIONS[code] || 'Bilinmeyen hata';
    super(`${code}: ${description}`);
    this.name = 'SystemError';
    this.code = code;
    this.severity = severity;
    this.timestamp = new Date().toISOString();
    this.context = context;
  }
}

// ─── UNIQUE ERROR ID (UID) ÜRETİCİ ─────────────────────────
// Her hata oluşumuna benzersiz bir kimlik atanır.
// Format: UID-YYYYMMDD-HHMMSS-XXXX
// Bu sayede operatör hatanın tam kaynağını izleyebilir.
// ─────────────────────────────────────────────────────────────
export function generateUID(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `UID-${date}-${time}-${rand}`;
}

// ─── KAYNAK ÇIKARICI (Stack Trace) ──────────────────────────
// Hatanın hangi dosya ve fonksiyondan geldiğini otomatik tespit eder.
// ─────────────────────────────────────────────────────────────
function extractErrorSource(): { file: string; func: string } {
  const fallback = { file: 'bilinmiyor', func: 'bilinmiyor' };
  try {
    const stack = new Error().stack;
    if (!stack) return fallback;
    // İlk 3 satırı atla (Error, extractErrorSource, processError)
    const lines = stack.split('\n').filter(l => l.includes('at '));
    const callerLine = lines[2] ?? lines[1] ?? '';
    // Fonksiyon adını çıkar
    const funcMatch = callerLine.match(/at\s+([\w.]+)\s*\(/);
    const func = funcMatch?.[1] ?? 'anonim';
    // Dosya adını çıkar
    const fileMatch = callerLine.match(/\(?([^)]+\.[tj]sx?)/);
    let file: string = fileMatch?.[1] ?? 'bilinmiyor';
    // Sadece dosya adını al (tam yol yerine)
    const lastSlash = Math.max(file.lastIndexOf('/'), file.lastIndexOf('\\'));
    if (lastSlash >= 0) file = file.substring(lastSlash + 1);
    return { file, func };
  } catch {
    return fallback;
  }
}

// ─── MERKEZİ HATA İŞLEME FONKSİYONU ────────────────────────
// Her catch bloğu bu fonksiyonu çağırmalıdır.
// Jenerik metin YASAKTIR — her zaman ERR kodu kullanılır.
// Her hata oluşumuna benzersiz UID atanır.
// ─────────────────────────────────────────────────────────────
export interface ErrorResult {
  uid: string;
  code: ErrorCode;
  description: string;
  severity: ErrorSeverity;
  timestamp: string;
  message: string;
  source: { file: string; func: string };
  context: Record<string, unknown>;
}

export function processError(
  code: ErrorCode,
  rawError: unknown,
  context: Record<string, unknown> = {},
  severity: ErrorSeverity = 'ERROR'
): ErrorResult {
  const uid = generateUID();
  const message = rawError instanceof Error ? rawError.message : String(rawError);
  const description = ERR_DESCRIPTIONS[code] || 'Bilinmeyen hata';
  const source = extractErrorSource();

  // Standart format ile console çıktısı — UID + kaynak dahil
  console.error(
    `[${uid}] [${code}] ${description} | Kaynak: ${source.file}→${source.func} | ${message}`,
    context
  );

  return {
    uid,
    code,
    description,
    severity,
    timestamp: new Date().toISOString(),
    message,
    source,
    context,
  };
}

// ─── BAĞLANTI GUARD ─────────────────────────────────────────
// Supabase çağrısı yapmadan önce bağlantı kontrolü yapılır.
// Geçersizse ERR-STP001-013 fırlatılır.
// ─────────────────────────────────────────────────────────────
export function guardConnection(isValid: boolean, operationCode: ErrorCode): void {
  if (!isValid) {
    const err = processError(
      ERR.CONNECTION_INVALID,
      new Error('.env.local dosyasındaki SUPABASE bağlantı bilgileri eksik veya geçersiz'),
      { attempted_operation: operationCode },
      'CRITICAL'
    );
    throw new SystemError(ERR.CONNECTION_INVALID, { ...err.context }, 'CRITICAL');
  }
}

// ─── ACİL DURUM CATCH ŞABLONU ────────────────────────────────
// Tüm catch bloklarında kullanılacak standart kalıp:
//
// try {
//   // Supabase operasyonu
// } catch (error) {
//   processError(ERR.TASK_FETCH, error, { tablo: 'tasks', islem: 'SELECT' });
//   // VEYA acil durum:
//   processError(ERR.UNIDENTIFIED_COLLAPSE, error, { tablo: '???', islem: '???' }, 'FATAL');
// }
// ─────────────────────────────────────────────────────────────
