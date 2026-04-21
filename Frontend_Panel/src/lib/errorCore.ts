// ============================================================
// ERR-Sistem Takip Paneli001 — MERKEZİ HATA MOTORU
// ============================================================
// Tüm sistemdeki hata kodlarını tanımlar ve tek noktadan yönetir.
// Her Supabase işlemi bu motorun ERR kodlarını KULLANMAK ZORUNDADIR.
// Jenerik metin mesajları YASAKTIR.
// ============================================================
// Format: ERR-Sistem Takip Paneli001-XXX
//   Sistem Takip Paneli001 = Sistem Takip Paneli Modül 1
//   XXX    = 001–999 arası benzersiz hata numarası
// ============================================================

// ─── HATA KODU KAYIT DEFTERİ ─────────────────────────────────
export const ERR = {
  // ── GENEL SİSTEM (001–009) ──────────────────────────────────
  SYSTEM_GENERAL:        'ERR-Sistem Takip Paneli001-001',
  DB_CONNECTION:         'ERR-Sistem Takip Paneli001-002',

  // ── GÖREV İŞLEMLERİ (003–009) ──────────────────────────────
  TASK_FETCH:            'ERR-Sistem Takip Paneli001-003',
  TASK_UPDATE:           'ERR-Sistem Takip Paneli001-004',
  TASK_DELETE:           'ERR-Sistem Takip Paneli001-005',
  TASK_CREATE:           'ERR-Sistem Takip Paneli001-010',
  TASK_CREATE_GENERAL:   'ERR-Sistem Takip Paneli001-011',
  TASK_ARCHIVE:          'ERR-Sistem Takip Paneli001-008',
  TASK_REALTIME:         'ERR-Sistem Takip Paneli001-009',

  // ── AUDIT LOG İŞLEMLERİ (006–007, 017) ─────────────────────
  AUDIT_WRITE:           'ERR-Sistem Takip Paneli001-006',
  AUDIT_READ:            'ERR-Sistem Takip Paneli001-007',
  AUDIT_REALTIME:        'ERR-Sistem Takip Paneli001-017',

  // ── EXPORT / MÜHÜRLEME (012) ───────────────────────────────
  SYSTEM_EXPORT:         'ERR-Sistem Takip Paneli001-012',

  // ── BAĞLANTI DOĞRULAMA (013) ───────────────────────────────
  CONNECTION_INVALID:    'ERR-Sistem Takip Paneli001-013',

  // ── AI / TELEGRAM İŞLEMLERİ (014–016) ─────────────────────
  AI_ANALYSIS:           'ERR-Sistem Takip Paneli001-014',
  AI_CONNECTION:         'ERR-Sistem Takip Paneli001-015',
  TELEGRAM_SEND:         'ERR-Sistem Takip Paneli001-016',

  // ── YÖNETİM KURULU / KONSENSÜS (018–022) ──────────────────
  BOARD_CREATE:          'ERR-Sistem Takip Paneli001-018',
  BOARD_FETCH:           'ERR-Sistem Takip Paneli001-019',
  BOARD_VOTE:            'ERR-Sistem Takip Paneli001-020',
  BOARD_CONSENSUS:       'ERR-Sistem Takip Paneli001-021',
  BOARD_SEAL:            'ERR-Sistem Takip Paneli001-022',

  // ── DOSYA KİLİTLEME / YETKİ (023–025) ─────────────────────
  PERMISSION_DENIED:     'ERR-Sistem Takip Paneli001-023',
  OWNERSHIP_VERIFY:      'ERR-Sistem Takip Paneli001-024',
  LOCK_VIOLATION:        'ERR-Sistem Takip Paneli001-025',

  // ── BROWSER KONTROL (026–028) ──────────────────────────────
  BROWSER_LAUNCH:        'ERR-Sistem Takip Paneli001-026',
  BROWSER_NAVIGATE:      'ERR-Sistem Takip Paneli001-027',
  BROWSER_EXTRACT:       'ERR-Sistem Takip Paneli001-028',

  // ── KÖPRÜ / SAĞLIK / ALARM (030–034) ───────────────────────
  BRIDGE_CONNECTION:     'ERR-Sistem Takip Paneli001-030',
  BRIDGE_QUERY:          'ERR-Sistem Takip Paneli001-031',
  HEALTH_CHECK:          'ERR-Sistem Takip Paneli001-032',
  ALARM_CREATE:          'ERR-Sistem Takip Paneli001-033',
  ALARM_UPDATE:          'ERR-Sistem Takip Paneli001-034',

  // ── OLLAMA / AI PROVIDER (040–042) ─────────────────────────
  OLLAMA_CONNECTION:     'ERR-Sistem Takip Paneli001-040',
  OLLAMA_PARSE:          'ERR-Sistem Takip Paneli001-041',
  AI_PROVIDER_FALLBACK:  'ERR-Sistem Takip Paneli001-042',

  // ── AJAN REGİSTRY / KLONLAMA (045–049) ─────────────────────
  AGENT_NOT_FOUND:       'ERR-Sistem Takip Paneli001-045',
  AGENT_REGISTER:        'ERR-Sistem Takip Paneli001-046',
  AGENT_UPDATE:          'ERR-Sistem Takip Paneli001-047',
  AGENT_CLONE:           'ERR-Sistem Takip Paneli001-048',
  AGENT_CAPACITY:        'ERR-Sistem Takip Paneli001-049',

  // ── OTONOM MİMARİ & SHADOW DENETİM (070–079) ─────────────────
  OTONOM_SANITY_REJECT:  'ERR-Sistem Takip Paneli001-070',
  OTONOM_SHADOW_REJECT:  'ERR-Sistem Takip Paneli001-071',
  OTONOM_FSM_VIOLATION:  'ERR-Sistem Takip Paneli001-072',
  OTONOM_BUDGET_REJECT:  'ERR-Sistem Takip Paneli001-073',
  OTONOM_CONTRACT_FAIL:  'ERR-Sistem Takip Paneli001-074',

  // ── HERMAİ / PROOF MOTORU (080–099) ────────────────────────
  INPUT_MISSING:         'ERR-Sistem Takip Paneli001-050',
  INTENT_MALFORMED:      'ERR-Sistem Takip Paneli001-051',
  HERMAI_FAIL:           'ERR-Sistem Takip Paneli001-052',
  TESPIT_FAIL:           'ERR-Sistem Takip Paneli001-053',
  CRITERIA_INCOMPLETE:   'ERR-Sistem Takip Paneli001-054',
  DATA_FAIL:             'ERR-Sistem Takip Paneli001-055',
  SPEC_FAIL:             'ERR-Sistem Takip Paneli001-056',
  MODEL_FAIL:            'ERR-Sistem Takip Paneli001-057',
  PROOF_FAIL:            'ERR-Sistem Takip Paneli001-058',
  PROOF_CHAIN_BREAK:     'ERR-Sistem Takip Paneli001-059',
  VERIFY_FAIL:           'ERR-Sistem Takip Paneli001-060',
  VALIDATOR_MISMATCH:    'ERR-Sistem Takip Paneli001-061',
  REFUTE_FAIL:           'ERR-Sistem Takip Paneli001-062',
  HERMAI_CONSENSUS_FAIL: 'ERR-Sistem Takip Paneli001-063',
  EXECUTION_FAIL:        'ERR-Sistem Takip Paneli001-064',
  RUNTIME_FAIL:          'ERR-Sistem Takip Paneli001-065',

  // ── ACİL DURUM — TANIMLANAMAYAN ÇÖKME (999) ────────────────
  UNIDENTIFIED_COLLAPSE: 'ERR-Sistem Takip Paneli001-999',
} as const;

export type ErrorCode = typeof ERR[keyof typeof ERR];

// ─── HATA AÇIKLAMA HARİTASI ──────────────────────────────────
export const ERR_DESCRIPTIONS: Record<ErrorCode, string> = {
  'ERR-Sistem Takip Paneli001-001': 'Genel sistem hatası',
  'ERR-Sistem Takip Paneli001-002': 'Veritabanı bağlantı hatası',
  'ERR-Sistem Takip Paneli001-003': 'Görev listesi çekilemedi',
  'ERR-Sistem Takip Paneli001-004': 'Görev durumu güncellenemedi',
  'ERR-Sistem Takip Paneli001-005': 'Görev silinemedi',
  'ERR-Sistem Takip Paneli001-006': 'Audit log yazılamadı',
  'ERR-Sistem Takip Paneli001-007': 'Audit log okunamadı',
  'ERR-Sistem Takip Paneli001-008': 'Görev arşivlenemedi',
  'ERR-Sistem Takip Paneli001-009': 'Realtime kanal açılamadı',
  'ERR-Sistem Takip Paneli001-010': 'Görev oluşturulamadı (Supabase)',
  'ERR-Sistem Takip Paneli001-011': 'Görev oluşturulamadı (Genel)',
  'ERR-Sistem Takip Paneli001-012': 'Sistem verisi dışa aktarılamadı',
  'ERR-Sistem Takip Paneli001-013': 'Supabase bağlantı bilgileri eksik/geçersiz',
  'ERR-Sistem Takip Paneli001-014': 'AI görev analizi başarısız',
  'ERR-Sistem Takip Paneli001-015': 'OpenAI API bağlantı hatası',
  'ERR-Sistem Takip Paneli001-016': 'Telegram mesaj gönderilemedi',
  'ERR-Sistem Takip Paneli001-017': 'Audit log realtime kanalı açılamadı',
  'ERR-Sistem Takip Paneli001-018': 'Kurul kararı oluşturulamadı',
  'ERR-Sistem Takip Paneli001-019': 'Kurul kararları çekilemedi',
  'ERR-Sistem Takip Paneli001-020': 'AI ajan oyu kaydedilemedi',
  'ERR-Sistem Takip Paneli001-021': 'Konsensüs hesaplaması başarısız',
  'ERR-Sistem Takip Paneli001-022': 'Kurul mühürü uygulanamadı',
  'ERR-Sistem Takip Paneli001-023': 'Yazma yetkisi reddedildi — dosya kilidi aktif',
  'ERR-Sistem Takip Paneli001-024': 'Görev sahipliği doğrulanamadı',
  'ERR-Sistem Takip Paneli001-025': 'Dosya kilit ihlali tespit edildi',
  'ERR-Sistem Takip Paneli001-026': 'Tarayıcı başlatılamadı (Playwright)',
  'ERR-Sistem Takip Paneli001-027': 'Sayfa navigasyonu başarısız',
  'ERR-Sistem Takip Paneli001-028': 'Sayfa içerik çıkarma hatası',
  'ERR-Sistem Takip Paneli001-030': 'Dış sistem köprü bağlantısı başarısız',
  'ERR-Sistem Takip Paneli001-031': 'Dış sistem sorgusu başarısız',
  'ERR-Sistem Takip Paneli001-032': 'Sağlık kontrolü başarısız',
  'ERR-Sistem Takip Paneli001-033': 'Alarm oluşturulamadı',
  'ERR-Sistem Takip Paneli001-034': 'Alarm durumu güncellenemedi',
  'ERR-Sistem Takip Paneli001-040': 'Ollama yerel AI bağlantı hatası',
  'ERR-Sistem Takip Paneli001-041': 'Ollama yanıt parse hatası',
  'ERR-Sistem Takip Paneli001-042': 'AI provider fallback tetiklendi',
  'ERR-Sistem Takip Paneli001-045': 'Ajan bulunamadı',
  'ERR-Sistem Takip Paneli001-046': 'Ajan kaydı başarısız',
  'ERR-Sistem Takip Paneli001-047': 'Ajan güncelleme hatası',
  'ERR-Sistem Takip Paneli001-048': 'Ajan klonlama hatası',
  'ERR-Sistem Takip Paneli001-049': 'Kapasite boşluğu giderme başarısız',
  'ERR-Sistem Takip Paneli001-070': 'Otonom Görev Yaratımı Reddedildi (Zehirli Intent)',
  'ERR-Sistem Takip Paneli001-071': 'Gölge Denetçi Birimleri Çaprazlamakta Hata Buldu',
  'ERR-Sistem Takip Paneli001-072': 'Durum Makinesi: FSM Deterministik Fizik İhlali',
  'ERR-Sistem Takip Paneli001-073': 'Simülasyon Birimi: CPU veya Veritabanı Risk Limit Aşımı',
  'ERR-Sistem Takip Paneli001-074': 'Olasılıkçı Ajan Görev Sözleşmesi Hazırlanamadı',

  // ── HERMAİ / PROOF MOTORU ───────────────────────────────────
  'ERR-Sistem Takip Paneli001-050': 'Girdi eksik veya boş — işlem durdu',
  'ERR-Sistem Takip Paneli001-051': 'Niyet analizi bozuk — Sistem Takip Paneli çıktısı geçersiz',
  'ERR-Sistem Takip Paneli001-052': 'Sistem Takip Paneli analizi başarısız',
  'ERR-Sistem Takip Paneli001-053': 'Tespit motoru başarısız — kriter taraması durdu',
  'ERR-Sistem Takip Paneli001-054': '92 kriter tamamlanamadı — eksik doğrulama',
  'ERR-Sistem Takip Paneli001-055': 'Veri doğrulaması başarısız',
  'ERR-Sistem Takip Paneli001-056': 'Formal Spec oluşturulamadı',
  'ERR-Sistem Takip Paneli001-057': 'Model hatası — spec işlenemedi',
  'ERR-Sistem Takip Paneli001-058': 'Proof üretimi başarısız',
  'ERR-Sistem Takip Paneli001-059': 'Proof zinciri kırıldı — hash uyuşmazlığı',
  'ERR-Sistem Takip Paneli001-060': 'Doğrulayıcı başarısız',
  'ERR-Sistem Takip Paneli001-061': 'Çift doğrulayıcı uyuşmazlığı — kural ≠ AI kararı',
  'ERR-Sistem Takip Paneli001-062': 'Çürütme motoru başarısız',
  'ERR-Sistem Takip Paneli001-063': 'Sistem Takip Paneli konsensüs başarısız',
  'ERR-Sistem Takip Paneli001-064': 'Güvenli çalıştırma başarısız',
  'ERR-Sistem Takip Paneli001-065': 'Runtime invariant ihlali tespit edildi',
  'ERR-Sistem Takip Paneli001-999': 'TABLO ÇÖKMESI — TANIMLANAMAYAN HATA',
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
// Geçersizse ERR-Sistem Takip Paneli001-013 fırlatılır.
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
