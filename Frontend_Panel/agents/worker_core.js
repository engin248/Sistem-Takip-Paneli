// ============================================================
// agents/worker_core.js — A2 GÖREVİ
// ============================================================
// Ajan Zekası: Ajanların yetenek matrisini (Scraping/AI) ve
// AGENT_ID sistemini kodlar.
//
// Bu modül, STP'nin TypeScript katmanından (agentProfiles.ts,
// agentRegistry.ts, agentWorker.ts) bağımsız olarak çalışabilir
// bir Node.js worker core'dur.
//
// KRİTİK BAĞIMLILIK:
//   - agentRegistry.ts → 58 ajan kadrosu (K, A, B, C, D, ANTI, IVDE, CNTRL)
//   - agentProfiles.ts → Profil bazlı yetenek matrisi
//   - agentWorker.ts  → ReAct döngüsü + kural tabanlı motor
//   - orchestrator.ts → Görev → ajan yönlendirme kuralları
//
// A2 SORUMLULUK:
//   1. AGENT_ID şeması: Deterministic kimlik üretimi
//   2. Yetenek matrisi: Scraping / AI / Kural Tabanlı
//   3. Beceri eşleştirme: Görev → en uygun ajan seçimi
//   4. Worker yaşam döngüsü: start → execute → audit → stop
// ============================================================

'use strict';

const crypto = require('crypto');
const Validator = require('./Validator'); // Katman 2.5 — Bağımsız Doğrulama Servisi
// ═══════════════════════════════════════════════════════════════
// 1. AGENT_ID SİSTEMİ — Deterministik Kimlik Üretim Motoru
// ═══════════════════════════════════════════════════════════════

/**
 * AGENT_ID Şeması:
 *   K-{n}       → KOMUTA kadrosu (1-4)
 *   A-{nn}      → L1 İcraatçı  (01-10)
 *   B-{nn}      → L2 Denetçi   (01-06)
 *   C-{nn}      → L3 Hakem     (01-02)
 *   D-{nn}      → DESTEK       (01-28)
 *   ANTI-{nn}   → Antigravity icracıları
 *   IVDE-{nn}   → IVDE Codex icracıları
 *   CNTRL-{nn}  → Sistem denetçileri
 */

const KATMAN_PREFIX = {
  KOMUTA: 'K',
  L1:     'A',
  L2:     'B',
  L3:     'C',
  DESTEK: 'D',
};

const OZEL_PREFIXLER = ['ANTI', 'IVDE', 'CNTRL'];

/**
 * Verilen parametrelerden deterministik AGENT_ID üretir.
 * @param {string} katman - KOMUTA | L1 | L2 | L3 | DESTEK
 * @param {number} sira   - Katman içi sıra numarası
 * @param {string} [ozelPrefix] - ANTI | IVDE | CNTRL (özel ekip)
 * @returns {string} AGENT_ID
 */
function generateAgentId(katman, sira, ozelPrefix) {
  if (ozelPrefix && OZEL_PREFIXLER.includes(ozelPrefix)) {
    return `${ozelPrefix}-${String(sira).padStart(2, '0')}`;
  }
  const prefix = KATMAN_PREFIX[katman];
  if (!prefix) throw new Error(`Geçersiz katman: ${katman}`);
  return katman === 'KOMUTA'
    ? `${prefix}-${sira}`
    : `${prefix}-${String(sira).padStart(2, '0')}`;
}

/**
 * AGENT_ID'den katman ve sıra çözümler.
 * @param {string} agentId
 * @returns {{ katman: string, sira: number, prefix: string, ozelEkip: boolean }}
 */
function parseAgentId(agentId) {
  // Özel ekip kontrolü
  for (const op of OZEL_PREFIXLER) {
    if (agentId.startsWith(`${op}-`)) {
      const sira = parseInt(agentId.split('-')[1], 10);
      return { katman: op === 'CNTRL' ? 'L2' : 'L1', sira, prefix: op, ozelEkip: true };
    }
  }

  // Standart ekip
  const match = agentId.match(/^([A-Z])-(\d+)$/);
  if (!match) throw new Error(`Geçersiz AGENT_ID formatı: ${agentId}`);

  const prefix = match[1];
  const sira = parseInt(match[2], 10);

  const katmanMap = { K: 'KOMUTA', A: 'L1', B: 'L2', C: 'L3', D: 'DESTEK' };
  const katman = katmanMap[prefix];
  if (!katman) throw new Error(`Bilinmeyen prefix: ${prefix}`);

  return { katman, sira, prefix, ozelEkip: false };
}

/**
 * İş kimliği üretir — her iş benzersiz.
 * @param {string} agentId
 * @returns {string} JOB_ID
 */
function generateJobId(agentId) {
  const ts = Date.now().toString(36);
  const rand = crypto.randomBytes(4).toString('hex');
  return `${agentId}_${ts}_${rand}`;
}


// ═══════════════════════════════════════════════════════════════
// 2. YETENEK MATRİSİ — Scraping / AI / Kural Tabanlı
// ═══════════════════════════════════════════════════════════════

/**
 * Çalışma Modları:
 *   ai            → Ollama/OpenAI üzerinden akıl yürütme
 *   kural_tabanli → Deterministik mantık, sıfır AI maliyeti
 *   hibrit        → Önce AI dener, başarısız olursa kural tabanlıya düşer
 *   scraping      → Web scraping + veri çekme yetenekli
 */

/**
 * Yetenek Tipleri:
 *   SCRAPING → Web tarama, veri çekme, HTML parse
 *   AI       → LLM tabanlı analiz, prompt mühendisliği
 *   KURAL    → Deterministik, maliyet-sıfır işlem
 *   HIBRIT   → AI + kural karışımı
 *   UZMAN    → Alan-spesifik uzmanlık
 */

const YETENEK_TIPLERI = {
  SCRAPING: 'SCRAPING',
  AI:       'AI',
  KURAL:    'KURAL',
  HIBRIT:   'HIBRIT',
  UZMAN:    'UZMAN',
};

/**
 * Her ajan ID'si için yetenek matrisi.
 * Scraping ve AI yetkinliklerini tanımlar.
 */
const YETENEK_MATRISI = {
  // ── KOMUTA KADROSU ──────────────────────────────────────
  'K-1': {
    ad: 'KOMUTAN', katman: 'KOMUTA',
    yetenekler: [YETENEK_TIPLERI.AI],
    scraping: false, ai: true, kural_tabanli: false,
    ai_provider: 'ollama',
    beceriler: ['karar_verme', 'onay_red', 'strateji', 'gorev_atama', 'kriz_yonetimi'],
    araçlar: ['ragSorgula', 'apiCagir'],
    max_iterasyon: 2,
    maliyet_sinifi: 'ORTA',
  },
  'K-2': {
    ad: 'KURMAY', katman: 'KOMUTA',
    yetenekler: [YETENEK_TIPLERI.AI],
    scraping: false, ai: true, kural_tabanli: false,
    ai_provider: 'ollama',
    beceriler: ['is_plani_uretme', 'onceliklendirme', 'risk_analizi', 'kaynak_planlama'],
    araçlar: ['ragSorgula'],
    max_iterasyon: 3,
    maliyet_sinifi: 'ORTA',
  },
  'K-3': {
    ad: 'İSTİHBARAT', katman: 'KOMUTA',
    yetenekler: [YETENEK_TIPLERI.HIBRIT, YETENEK_TIPLERI.SCRAPING],
    scraping: true, ai: true, kural_tabanli: true,
    ai_provider: 'auto',
    beceriler: ['veri_toplama', 'trend_analizi', 'kaynak_tarama', 'tehdit_analizi'],
    araçlar: ['ragSorgula', 'apiCagir', 'dosyaOku', 'webAra'],
    max_iterasyon: 3,
    maliyet_sinifi: 'DÜŞÜK',
  },
  'K-4': {
    ad: 'MUHAFIZ', katman: 'KOMUTA',
    yetenekler: [YETENEK_TIPLERI.KURAL],
    scraping: false, ai: false, kural_tabanli: true,
    ai_provider: 'local',
    beceriler: ['guvenlik_denetimi', 'yetki_kontrolu', 'rls_yonetimi', 'saldiri_tespiti'],
    araçlar: ['ragSorgula', 'apiCagir', 'dosyaOku'],
    max_iterasyon: 3,
    maliyet_sinifi: 'SIFIR',
  },

  // ── L1 İCRAATÇILAR ─────────────────────────────────────
  'A-01': {
    ad: 'İCRACI-FE', katman: 'L1',
    yetenekler: [YETENEK_TIPLERI.AI, YETENEK_TIPLERI.UZMAN],
    scraping: false, ai: true, kural_tabanli: false,
    ai_provider: 'ollama',
    beceriler: ['react', 'nextjs', 'typescript', 'css', 'ui_ux', 'component_gelistirme'],
    araçlar: ['dosyaOku', 'dosyaYaz', 'dizinListele', 'ragSorgula'],
    max_iterasyon: 5,
    maliyet_sinifi: 'ORTA',
  },
  'A-02': {
    ad: 'İCRACI-BE', katman: 'L1',
    yetenekler: [YETENEK_TIPLERI.AI, YETENEK_TIPLERI.UZMAN],
    scraping: false, ai: true, kural_tabanli: false,
    ai_provider: 'ollama',
    beceriler: ['api_gelistirme', 'typescript', 'nextjs_api_routes', 'is_mantigi', 'rest_api'],
    araçlar: ['dosyaOku', 'dosyaYaz', 'dizinListele', 'ragSorgula'],
    max_iterasyon: 5,
    maliyet_sinifi: 'ORTA',
  },
  'A-03': {
    ad: 'İCRACI-DB', katman: 'L1',
    yetenekler: [YETENEK_TIPLERI.HIBRIT, YETENEK_TIPLERI.UZMAN],
    scraping: false, ai: true, kural_tabanli: true,
    ai_provider: 'auto',
    beceriler: ['supabase', 'postgresql', 'sql', 'migration', 'rls_policy'],
    araçlar: ['dosyaOku', 'dosyaYaz', 'ragSorgula', 'apiCagir'],
    max_iterasyon: 4,
    maliyet_sinifi: 'DÜŞÜK',
  },
  'A-04': {
    ad: 'İCRACI-BOT', katman: 'L1',
    yetenekler: [YETENEK_TIPLERI.HIBRIT, YETENEK_TIPLERI.SCRAPING],
    scraping: true, ai: true, kural_tabanli: true,
    ai_provider: 'auto',
    beceriler: ['telegram_api', 'bot_gelistirme', 'webhook', 'bildirim_gonderme'],
    araçlar: ['dosyaOku', 'dosyaYaz', 'apiCagir', 'ragSorgula'],
    max_iterasyon: 4,
    maliyet_sinifi: 'DÜŞÜK',
  },
  'A-05': {
    ad: 'İCRACI-TEST', katman: 'L1',
    yetenekler: [YETENEK_TIPLERI.KURAL],
    scraping: false, ai: false, kural_tabanli: true,
    ai_provider: 'local',
    beceriler: ['vitest', 'playwright', 'unit_test', 'e2e_test', 'mock_stub'],
    araçlar: ['dosyaOku', 'dosyaYaz', 'dizinListele', 'ragSorgula'],
    max_iterasyon: 4,
    maliyet_sinifi: 'SIFIR',
  },
  'A-06': {
    ad: 'İCRACI-SEC', katman: 'L1',
    yetenekler: [YETENEK_TIPLERI.KURAL, YETENEK_TIPLERI.UZMAN],
    scraping: false, ai: false, kural_tabanli: true,
    ai_provider: 'local',
    beceriler: ['penetrasyon_testi', 'kriptografi', 'owasp', 'jwt', 'xss_sqli_onleme'],
    araçlar: ['dosyaOku', 'dosyaYaz', 'ragSorgula'],
    max_iterasyon: 4,
    maliyet_sinifi: 'SIFIR',
  },
  'A-07': {
    ad: 'İCRACI-AI', katman: 'L1',
    yetenekler: [YETENEK_TIPLERI.AI, YETENEK_TIPLERI.UZMAN],
    scraping: false, ai: true, kural_tabanli: false,
    ai_provider: 'ollama',
    beceriler: ['ollama', 'llm', 'prompt_engineering', 'ai_entegrasyon', 'rag'],
    araçlar: ['dosyaOku', 'dosyaYaz', 'apiCagir', 'ragSorgula'],
    max_iterasyon: 4,
    maliyet_sinifi: 'ORTA',
  },
  'A-08': {
    ad: 'İCRACI-DATA', katman: 'L1',
    yetenekler: [YETENEK_TIPLERI.HIBRIT, YETENEK_TIPLERI.SCRAPING],
    scraping: true, ai: true, kural_tabanli: true,
    ai_provider: 'auto',
    beceriler: ['veri_analizi', 'etl', 'aggregation', 'raporlama', 'csv_json_parse', 'data_pipeline', 'istatistik_hesaplama', 'veri_donusumu'],
    araçlar: ['dosyaOku', 'dosyaYaz', 'apiCagir', 'ragSorgula'],
    max_iterasyon: 4,
    maliyet_sinifi: 'DÜŞÜK',
  },
  'A-09': {
    ad: 'İCRACI-INFRA', katman: 'L1',
    yetenekler: [YETENEK_TIPLERI.KURAL],
    scraping: false, ai: false, kural_tabanli: true,
    ai_provider: 'local',
    beceriler: ['docker', 'vercel', 'environment', 'ci_cd', 'monitoring'],
    araçlar: ['dosyaOku', 'dosyaYaz', 'dizinListele', 'ragSorgula'],
    max_iterasyon: 3,
    maliyet_sinifi: 'SIFIR',
  },
  'A-10': {
    ad: 'İCRACI-AKIŞ', katman: 'L1',
    yetenekler: [YETENEK_TIPLERI.KURAL],
    scraping: false, ai: false, kural_tabanli: true,
    ai_provider: 'local',
    beceriler: ['workflow_orchestration', 'event_driven', 'cron', 'otomasyon'],
    araçlar: ['dosyaOku', 'dosyaYaz', 'apiCagir', 'ragSorgula'],
    max_iterasyon: 4,
    maliyet_sinifi: 'SIFIR',
  },

  // ── L2 DENETÇİLER ──────────────────────────────────────
  'B-01': {
    ad: 'DENETÇİ-KOD', katman: 'L2',
    yetenekler: [YETENEK_TIPLERI.AI],
    scraping: false, ai: true, kural_tabanli: false,
    ai_provider: 'ollama',
    beceriler: ['kod_inceleme', 'standart_kontrolu', 'tip_guvenligi', 'mimari_dogrulama'],
    araçlar: ['dosyaOku', 'ragSorgula'],
    max_iterasyon: 3,
    maliyet_sinifi: 'ORTA',
  },
  'B-02': {
    ad: 'DENETÇİ-DOĞRULA', katman: 'L2',
    yetenekler: [YETENEK_TIPLERI.HIBRIT],
    scraping: false, ai: true, kural_tabanli: true,
    ai_provider: 'auto',
    beceriler: ['teknik_dogrulama', 'guvenlik_dogrulama', 'bes_eksen_analiz'],
    araçlar: ['dosyaOku', 'apiCagir', 'ragSorgula'],
    max_iterasyon: 3,
    maliyet_sinifi: 'DÜŞÜK',
  },
  'B-03': {
    ad: 'DENETÇİ-GÜVENLİK', katman: 'L2',
    yetenekler: [YETENEK_TIPLERI.KURAL],
    scraping: false, ai: false, kural_tabanli: true,
    ai_provider: 'local',
    beceriler: ['zaafiyet_tarama', 'rls_kontrol', 'owasp_denetim'],
    araçlar: ['dosyaOku', 'ragSorgula'],
    max_iterasyon: 3,
    maliyet_sinifi: 'SIFIR',
  },
  'B-04': {
    ad: 'DENETÇİ-PERF', katman: 'L2',
    yetenekler: [YETENEK_TIPLERI.KURAL],
    scraping: false, ai: false, kural_tabanli: true,
    ai_provider: 'local',
    beceriler: ['core_web_vitals', 'latency_analizi', 'benchmark', 'cache_kontrol'],
    araçlar: ['dosyaOku', 'apiCagir', 'ragSorgula'],
    max_iterasyon: 3,
    maliyet_sinifi: 'SIFIR',
  },
  'B-05': {
    ad: 'DENETÇİ-VERİ', katman: 'L2',
    yetenekler: [YETENEK_TIPLERI.KURAL],
    scraping: false, ai: false, kural_tabanli: true,
    ai_provider: 'local',
    beceriler: ['schema_dogrulama', 'veri_kalitesi', 'tutarlilik_kontrolu'],
    araçlar: ['dosyaOku', 'apiCagir', 'ragSorgula'],
    max_iterasyon: 3,
    maliyet_sinifi: 'SIFIR',
  },
  'B-06': {
    ad: 'DENETÇİ-UX', katman: 'L2',
    yetenekler: [YETENEK_TIPLERI.HIBRIT],
    scraping: false, ai: true, kural_tabanli: true,
    ai_provider: 'auto',
    beceriler: ['erisim_analizi', 'kullanilabilirlik', 'wcag_uyumu'],
    araçlar: ['dosyaOku', 'ragSorgula'],
    max_iterasyon: 2,
    maliyet_sinifi: 'DÜŞÜK',
  },

  // ── L3 HAKEMLER ─────────────────────────────────────────
  'C-01': {
    ad: 'HAKEM-1', katman: 'L3',
    yetenekler: [YETENEK_TIPLERI.AI],
    scraping: false, ai: true, kural_tabanli: false,
    ai_provider: 'ollama',
    beceriler: ['celiskilik_cozum', 'nihai_karar', 'kanit_degerlendirme'],
    araçlar: ['dosyaOku', 'ragSorgula'],
    max_iterasyon: 2,
    maliyet_sinifi: 'ORTA',
  },
  'C-02': {
    ad: 'HAKEM-2', katman: 'L3',
    yetenekler: [YETENEK_TIPLERI.AI],
    scraping: false, ai: true, kural_tabanli: false,
    ai_provider: 'ollama',
    beceriler: ['stratejik_karar', 'mimari_secim', 'uzun_vade_planlama'],
    araçlar: ['dosyaOku', 'ragSorgula'],
    max_iterasyon: 2,
    maliyet_sinifi: 'ORTA',
  },

  // ── DESTEK KADROSU (D-01 → D-28) ─────────────────────────
  // Tümü lokal, sıfır maliyet, kural tabanlı
  'D-01': {
    ad: 'MÜHÜRDAR', katman: 'DESTEK',
    yetenekler: [YETENEK_TIPLERI.KURAL],
    scraping: false, ai: false, kural_tabanli: true,
    ai_provider: 'local',
    beceriler: ['audit_log', 'sha256_muhur', 'arsivleme', 'kanit_uretimi', 'zaman_damgasi'],
    araçlar: ['dosyaOku', 'dosyaYaz', 'ragSorgula'],
    max_iterasyon: 3, maliyet_sinifi: 'SIFIR',
  },
  'D-02': {
    ad: 'OTOMASYON', katman: 'DESTEK',
    yetenekler: [YETENEK_TIPLERI.KURAL],
    scraping: false, ai: false, kural_tabanli: true,
    ai_provider: 'local',
    beceriler: ['ci_cd', 'deployment', 'git_islemleri', 'vercel_deploy', 'github_actions'],
    araçlar: ['dosyaOku', 'dosyaYaz', 'dizinListele', 'apiCagir'],
    max_iterasyon: 3, maliyet_sinifi: 'SIFIR',
  },
  'D-03': {
    ad: 'ARGE', katman: 'DESTEK',
    yetenekler: [YETENEK_TIPLERI.KURAL],
    scraping: false, ai: false, kural_tabanli: true,
    ai_provider: 'local',
    beceriler: ['trend_analizi', 'beceri_haritasi', 'pazar_arastirmasi', 'kaynak_tarama'],
    araçlar: ['dosyaOku', 'ragSorgula', 'webAra'],
    max_iterasyon: 3, maliyet_sinifi: 'SIFIR',
  },
  'D-04': {
    ad: 'KÖPRÜ', katman: 'DESTEK',
    yetenekler: [YETENEK_TIPLERI.KURAL],
    scraping: false, ai: false, kural_tabanli: true,
    ai_provider: 'local',
    beceriler: ['dis_sistem_entegrasyon', 'api_koprusu', 'veri_senkronizasyon', 'skm_baglanti'],
    araçlar: ['apiCagir', 'dosyaOku', 'dosyaYaz', 'ragSorgula'],
    max_iterasyon: 3, maliyet_sinifi: 'SIFIR',
  },
  'D-05': {
    ad: 'NÖBETÇİ', katman: 'DESTEK',
    yetenekler: [YETENEK_TIPLERI.KURAL],
    scraping: false, ai: false, kural_tabanli: true,
    ai_provider: 'local',
    beceriler: ['alarm_monitoring', 'anomali_tespiti', 'esik_kontrolu', 'sistem_izleme', 'uptime'],
    araçlar: ['apiCagir', 'dosyaOku', 'ragSorgula'],
    max_iterasyon: 3, maliyet_sinifi: 'SIFIR',
  },
  'D-06': {
    ad: 'DÖKÜMANTER', katman: 'DESTEK',
    yetenekler: [YETENEK_TIPLERI.KURAL],
    scraping: false, ai: false, kural_tabanli: true,
    ai_provider: 'local',
    beceriler: ['readme', 'api_docs', 'sema_diyagram', 'changelog', 'teknik_dokuman'],
    araçlar: ['dosyaOku', 'dosyaYaz', 'dizinListele', 'ragSorgula'],
    max_iterasyon: 3, maliyet_sinifi: 'SIFIR',
  },
  'D-07': {
    ad: 'HAFIZA', katman: 'DESTEK',
    yetenekler: [YETENEK_TIPLERI.KURAL],
    scraping: false, ai: false, kural_tabanli: true,
    ai_provider: 'local',
    beceriler: ['uzun_sureli_baglam', 'onceki_kararlar', 'pattern_arsivi', 'bilgi_bankasi'],
    araçlar: ['dosyaOku', 'dosyaYaz', 'ragSorgula'],
    max_iterasyon: 2, maliyet_sinifi: 'SIFIR',
  },
  'D-08': {
    ad: 'HABERCİ', katman: 'DESTEK',
    yetenekler: [YETENEK_TIPLERI.KURAL],
    scraping: false, ai: false, kural_tabanli: true,
    ai_provider: 'local',
    beceriler: ['telegram_bildirim', 'email', 'webhook_bildirim', 'bildirim_orkestrasyon'],
    araçlar: ['apiCagir', 'dosyaOku', 'ragSorgula'],
    max_iterasyon: 3, maliyet_sinifi: 'SIFIR',
  },
  'D-09': {
    ad: 'ANALİST', katman: 'DESTEK',
    yetenekler: [YETENEK_TIPLERI.KURAL],
    scraping: false, ai: false, kural_tabanli: true,
    ai_provider: 'local',
    beceriler: ['istatistik', 'kpi_takibi', 'trend_grafik', 'karar_destek', 'metrik_analizi'],
    araçlar: ['dosyaOku', 'apiCagir', 'ragSorgula'],
    max_iterasyon: 3, maliyet_sinifi: 'SIFIR',
  },
  'D-10': {
    ad: 'PLANLAYICI', katman: 'DESTEK',
    yetenekler: [YETENEK_TIPLERI.KURAL],
    scraping: false, ai: false, kural_tabanli: true,
    ai_provider: 'local',
    beceriler: ['sprint_planlama', 'milestone', 'gorev_agaci', 'bagimlilik_haritasi'],
    araçlar: ['dosyaOku', 'dosyaYaz', 'ragSorgula'],
    max_iterasyon: 3, maliyet_sinifi: 'SIFIR',
  },
  'D-11': {
    ad: 'ÇEVİRMEN', katman: 'DESTEK',
    yetenekler: [YETENEK_TIPLERI.KURAL],
    scraping: false, ai: false, kural_tabanli: true,
    ai_provider: 'local',
    beceriler: ['i18n', 'tr_en_ceviri', 'rtl_uyumu', 'lokalizasyon'],
    araçlar: ['dosyaOku', 'dosyaYaz', 'ragSorgula'],
    max_iterasyon: 2, maliyet_sinifi: 'SIFIR',
  },
  'D-12': {
    ad: 'YEDEKÇİ', katman: 'DESTEK',
    yetenekler: [YETENEK_TIPLERI.KURAL],
    scraping: false, ai: false, kural_tabanli: true,
    ai_provider: 'local',
    beceriler: ['otomatik_yedek', 'felaket_kurtarma', 'rollback', 'snapshot'],
    araçlar: ['dosyaOku', 'dosyaYaz', 'dizinListele', 'ragSorgula'],
    max_iterasyon: 3, maliyet_sinifi: 'SIFIR',
  },
  'D-13': {
    ad: 'ÖNBELLEK', katman: 'DESTEK',
    yetenekler: [YETENEK_TIPLERI.KURAL],
    scraping: false, ai: false, kural_tabanli: true,
    ai_provider: 'local',
    beceriler: ['redis_cache', 'in_memory_cache', 'ttl_stratejisi', 'invalidasyon'],
    araçlar: ['apiCagir', 'dosyaOku', 'ragSorgula'],
    max_iterasyon: 2, maliyet_sinifi: 'SIFIR',
  },
  'D-14': {
    ad: 'OPTİMİZÖR', katman: 'DESTEK',
    yetenekler: [YETENEK_TIPLERI.KURAL],
    scraping: false, ai: false, kural_tabanli: true,
    ai_provider: 'local',
    beceriler: ['algoritma_iyilestirme', 'db_sorgu_optimizasyon', 'bundle_kucultme', 'performans'],
    araçlar: ['dosyaOku', 'dosyaYaz', 'ragSorgula'],
    max_iterasyon: 3, maliyet_sinifi: 'SIFIR',
  },
  'D-15': {
    ad: 'DEDEKTİF', katman: 'DESTEK',
    yetenekler: [YETENEK_TIPLERI.KURAL],
    scraping: false, ai: false, kural_tabanli: true,
    ai_provider: 'local',
    beceriler: ['hata_ayiklama', 'kok_neden_analizi', 'stack_trace', 'log_analizi', 'reproduksiyon'],
    araçlar: ['dosyaOku', 'dizinListele', 'ragSorgula'],
    max_iterasyon: 4, maliyet_sinifi: 'SIFIR',
  },
  'D-16': {
    ad: 'KORDİNATÖR', katman: 'DESTEK',
    yetenekler: [YETENEK_TIPLERI.KURAL],
    scraping: false, ai: false, kural_tabanli: true,
    ai_provider: 'local',
    beceriler: ['gorev_dagitimi', 'is_kuyrugu', 'kapasite_yonetimi', 'ajan_koordinasyon'],
    araçlar: ['apiCagir', 'dosyaOku', 'ragSorgula'],
    max_iterasyon: 3, maliyet_sinifi: 'SIFIR',
  },
  'D-17': {
    ad: 'SİNYAL', katman: 'DESTEK',
    yetenekler: [YETENEK_TIPLERI.KURAL],
    scraping: false, ai: false, kural_tabanli: true,
    ai_provider: 'local',
    beceriler: ['pub_sub', 'event_bus', 'gercek_zamanli_bildirim', 'sse_websocket'],
    araçlar: ['apiCagir', 'dosyaOku', 'ragSorgula'],
    max_iterasyon: 3, maliyet_sinifi: 'SIFIR',
  },
  'D-18': {
    ad: 'KURAL-MOTOR', katman: 'DESTEK',
    yetenekler: [YETENEK_TIPLERI.KURAL],
    scraping: false, ai: false, kural_tabanli: true,
    ai_provider: 'local',
    beceriler: ['is_kurallari', 'politika_uygulama', 'uyum_denetimi', 'kural_motoru'],
    araçlar: ['dosyaOku', 'dosyaYaz', 'ragSorgula'],
    max_iterasyon: 3, maliyet_sinifi: 'SIFIR',
  },
  'D-19': {
    ad: 'RAPORCU', katman: 'DESTEK',
    yetenekler: [YETENEK_TIPLERI.KURAL],
    scraping: false, ai: false, kural_tabanli: true,
    ai_provider: 'local',
    beceriler: ['otomatik_rapor', 'pdf_csv_json_export', 'periyodik_ozet', 'rapor_sablonu'],
    araçlar: ['dosyaOku', 'dosyaYaz', 'ragSorgula'],
    max_iterasyon: 3, maliyet_sinifi: 'SIFIR',
  },
  'D-20': {
    ad: 'FORMATÖR', katman: 'DESTEK',
    yetenekler: [YETENEK_TIPLERI.KURAL],
    scraping: false, ai: false, kural_tabanli: true,
    ai_provider: 'local',
    beceriler: ['kod_stili', 'naming_convention', 'sema_standardizasyon', 'lint'],
    araçlar: ['dosyaOku', 'dosyaYaz', 'dizinListele', 'ragSorgula'],
    max_iterasyon: 2, maliyet_sinifi: 'SIFIR',
  },
  'D-21': {
    ad: 'TETİKÇİ', katman: 'DESTEK',
    yetenekler: [YETENEK_TIPLERI.KURAL],
    scraping: false, ai: false, kural_tabanli: true,
    ai_provider: 'local',
    beceriler: ['cron_jobs', 'zamanli_gorev', 'bekleme_yonetimi', 'tetikleyici'],
    araçlar: ['apiCagir', 'dosyaOku', 'ragSorgula'],
    max_iterasyon: 3, maliyet_sinifi: 'SIFIR',
  },
  'D-22': {
    ad: 'ARABULUCU', katman: 'DESTEK',
    yetenekler: [YETENEK_TIPLERI.KURAL],
    scraping: false, ai: false, kural_tabanli: true,
    ai_provider: 'local',
    beceriler: ['versiyon_cakismasi', 'merge_conflict', 'anlasmazlik_yonetimi'],
    araçlar: ['dosyaOku', 'dosyaYaz', 'ragSorgula'],
    max_iterasyon: 2, maliyet_sinifi: 'SIFIR',
  },
  'D-23': {
    ad: 'MÜHENDİS', katman: 'DESTEK',
    yetenekler: [YETENEK_TIPLERI.KURAL],
    scraping: false, ai: false, kural_tabanli: true,
    ai_provider: 'local',
    beceriler: ['mimari_tasarim', 'teknik_borc_yonetimi', 'refactoring', 'sistem_muhendisligi'],
    araçlar: ['dosyaOku', 'dosyaYaz', 'dizinListele', 'ragSorgula'],
    max_iterasyon: 3, maliyet_sinifi: 'SIFIR',
  },
  'D-24': {
    ad: 'KEŞFEDEN', katman: 'DESTEK',
    yetenekler: [YETENEK_TIPLERI.KURAL],
    scraping: false, ai: false, kural_tabanli: true,
    ai_provider: 'local',
    beceriler: ['kutuphane_arastirma', 'alternatif_cozum', 'poc_uretme', 'teknoloji_kesfi'],
    araçlar: ['dosyaOku', 'ragSorgula', 'webAra'],
    max_iterasyon: 3, maliyet_sinifi: 'SIFIR',
  },
  'D-25': {
    ad: 'SORGULAYICI', katman: 'DESTEK',
    yetenekler: [YETENEK_TIPLERI.KURAL],
    scraping: false, ai: false, kural_tabanli: true,
    ai_provider: 'local',
    beceriler: ['veri_sorgulama', 'filtreleme', 'arama_indeksi', 'fulltext_search'],
    araçlar: ['apiCagir', 'dosyaOku', 'ragSorgula'],
    max_iterasyon: 3, maliyet_sinifi: 'SIFIR',
  },
  'D-26': {
    ad: 'UYUMCU', katman: 'DESTEK',
    yetenekler: [YETENEK_TIPLERI.KURAL],
    scraping: false, ai: false, kural_tabanli: true,
    ai_provider: 'local',
    beceriler: ['kvkk', 'gdpr', 'erisilebilirlik', 'yasal_gereksinimler', 'mevzuat'],
    araçlar: ['dosyaOku', 'ragSorgula'],
    max_iterasyon: 2, maliyet_sinifi: 'SIFIR',
  },
  'D-27': {
    ad: 'ÖLÇER', katman: 'DESTEK',
    yetenekler: [YETENEK_TIPLERI.KURAL],
    scraping: false, ai: false, kural_tabanli: true,
    ai_provider: 'local',
    beceriler: ['sistem_metrikleri', 'uptime', 'sla_takibi', 'kapasite_plani'],
    araçlar: ['apiCagir', 'dosyaOku', 'ragSorgula'],
    max_iterasyon: 3, maliyet_sinifi: 'SIFIR',
  },
  'D-28': {
    ad: 'ÖĞRETMEN', katman: 'DESTEK',
    yetenekler: [YETENEK_TIPLERI.KURAL],
    scraping: false, ai: false, kural_tabanli: true,
    ai_provider: 'local',
    beceriler: ['egitim_materyali', 'onboarding', 'best_practice', 'bilgi_transferi'],
    araçlar: ['dosyaOku', 'dosyaYaz', 'ragSorgula'],
    max_iterasyon: 2, maliyet_sinifi: 'SIFIR',
  },

  // ── ÖZEL EKİPLER ────────────────────────────────────────
  'ANTI-01': {
    ad: 'ANTI-A1', katman: 'OZEL',
    yetenekler: [YETENEK_TIPLERI.KURAL],
    scraping: false, ai: false, kural_tabanli: true,
    ai_provider: 'local',
    beceriler: ['aritmetik_islem', 'hesaplama', 'veri_dogrulama'],
    araçlar: ['dosyaOku', 'ragSorgula'],
    max_iterasyon: 2, maliyet_sinifi: 'SIFIR',
  },
  'ANTI-02': {
    ad: 'ANTI-A2', katman: 'OZEL',
    yetenekler: [YETENEK_TIPLERI.KURAL],
    scraping: false, ai: false, kural_tabanli: true,
    ai_provider: 'local',
    beceriler: ['aritmetik_islem', 'hesaplama', 'veri_dogrulama'],
    araçlar: ['dosyaOku', 'ragSorgula'],
    max_iterasyon: 2, maliyet_sinifi: 'SIFIR',
  },
  'IVDE-01': {
    ad: 'IVDE-C1', katman: 'OZEL',
    yetenekler: [YETENEK_TIPLERI.KURAL],
    scraping: false, ai: false, kural_tabanli: true,
    ai_provider: 'local',
    beceriler: ['codex_islem', 'kod_uretimi', 'sema_dogrulama'],
    araçlar: ['dosyaOku', 'dosyaYaz', 'ragSorgula'],
    max_iterasyon: 2, maliyet_sinifi: 'SIFIR',
  },
  'IVDE-02': {
    ad: 'IVDE-C2', katman: 'OZEL',
    yetenekler: [YETENEK_TIPLERI.KURAL],
    scraping: false, ai: false, kural_tabanli: true,
    ai_provider: 'local',
    beceriler: ['codex_islem', 'kod_uretimi', 'sema_dogrulama'],
    araçlar: ['dosyaOku', 'dosyaYaz', 'ragSorgula'],
    max_iterasyon: 2, maliyet_sinifi: 'SIFIR',
  },
  'CNTRL-01': {
    ad: 'KONTROL-1', katman: 'KONTROL',
    yetenekler: [YETENEK_TIPLERI.KURAL],
    scraping: false, ai: false, kural_tabanli: true,
    ai_provider: 'local',
    beceriler: ['sistem_denetimi', 'izleme', 'uygunluk_kontrolu', 'mudahale_yasak'],
    araçlar: ['dosyaOku', 'ragSorgula'],
    max_iterasyon: 2, maliyet_sinifi: 'SIFIR',
  },
  'CNTRL-02': {
    ad: 'KONTROL-2', katman: 'KONTROL',
    yetenekler: [YETENEK_TIPLERI.KURAL],
    scraping: false, ai: false, kural_tabanli: true,
    ai_provider: 'local',
    beceriler: ['sistem_denetimi', 'izleme', 'uygunluk_kontrolu', 'mudahale_yasak'],
    araçlar: ['dosyaOku', 'ragSorgula'],
    max_iterasyon: 2, maliyet_sinifi: 'SIFIR',
  },
  'CNTRL-03': {
    ad: 'KONTROL-3', katman: 'KONTROL',
    yetenekler: [YETENEK_TIPLERI.KURAL],
    scraping: false, ai: false, kural_tabanli: true,
    ai_provider: 'local',
    beceriler: ['sistem_denetimi', 'izleme', 'uygunluk_kontrolu', 'mudahale_yasak'],
    araçlar: ['dosyaOku', 'ragSorgula'],
    max_iterasyon: 2, maliyet_sinifi: 'SIFIR',
  },
  'CNTRL-04': {
    ad: 'KONTROL-4', katman: 'KONTROL',
    yetenekler: [YETENEK_TIPLERI.KURAL],
    scraping: false, ai: false, kural_tabanli: true,
    ai_provider: 'local',
    beceriler: ['sistem_denetimi', 'izleme', 'uygunluk_kontrolu', 'mudahale_yasak'],
    araçlar: ['dosyaOku', 'ragSorgula'],
    max_iterasyon: 2, maliyet_sinifi: 'SIFIR',
  },
};


// ═══════════════════════════════════════════════════════════════
// 3. BECERİ EŞLEŞTİRME MOTORU
// ═══════════════════════════════════════════════════════════════

/**
 * Görev metninden en uygun ajan(lar)ı tespit eder.
 * @param {string} gorev - Görev açıklaması
 * @returns {{ ajanId: string, skor: number, ad: string, mod: string }[]} - Sıralı eşleşme listesi
 */
function eslestir(gorev) {
  const gorevLower = gorev.toLowerCase();
  const sonuclar = [];

  for (const [ajanId, matris] of Object.entries(YETENEK_MATRISI)) {
    let skor = 0;

    // Beceri eşleştirme
    for (const beceri of matris.beceriler) {
      const kelimeler = beceri.split('_');
      for (const k of kelimeler) {
        if (gorevLower.includes(k.toLowerCase()) && k.length > 2) {
          skor += 2;
        }
      }
    }

    // Scraping eşleştirme
    const scrapingAnahtarlar = ['scrape', 'tara', 'çek', 'fetch', 'kazı', 'web data', 'html parse', 'crawl'];
    if (matris.scraping) {
      for (const sa of scrapingAnahtarlar) {
        if (gorevLower.includes(sa)) skor += 3;
      }
    }

    // AI eşleştirme
    const aiAnahtarlar = ['ai', 'yapay zeka', 'analiz et', 'düşün', 'strateji', 'model', 'prompt', 'llm'];
    if (matris.ai) {
      for (const aa of aiAnahtarlar) {
        if (gorevLower.includes(aa)) skor += 2;
      }
    }

    if (skor > 0) {
      sonuclar.push({
        ajanId,
        skor,
        ad: matris.ad,
        mod: matris.ai ? (matris.kural_tabanli ? 'HIBRIT' : 'AI') : 'KURAL',
        maliyet: matris.maliyet_sinifi,
      });
    }
  }

  // Skora göre sırala (yüksek → düşük)
  sonuclar.sort((a, b) => b.skor - a.skor);
  return sonuclar;
}


// ═══════════════════════════════════════════════════════════════
// 3.5 AI PROVIDER SEÇİM TABLOSU
// ═══════════════════════════════════════════════════════════════
// Tespit edilen lokal AI kaynakları:
//   ✅ Ollama   → localhost:11434 (llama3 8B, qwen3.5 9.7B, llama3.2:1b)
//   ✅ Claude Code → Terminal CLI (@anthropic-ai/claude-code 2.1.114)
//   ❌ LM Studio → kapalı
//   ❌ LocalAI   → kapalı
//
// Strateji: Karar ajanları → qwen3.5 (güçlü), Kod ajanları → llama3,
//           Kritik hakemler → claude_code, Geri kalan → kural tabanlı

const AI_PROVIDER_SECIMI = {
  // ── KOMUTA — strateji/karar: güçlü model ────────────────
  'K-1': { provider: 'ollama', model: 'qwen3.5:latest' },  // KOMUTAN → stratejik karar
  'K-2': { provider: 'ollama', model: 'qwen3.5:latest' },  // KURMAY → iş planı
  'K-3': { provider: 'ollama', model: 'llama3:latest' },    // İSTİHBARAT → analiz

  // ── L1 İCRA — kod yazanlar: dengeli model ───────────────
  'A-01': { provider: 'ollama', model: 'llama3:latest' },   // FE → React/CSS
  'A-02': { provider: 'ollama', model: 'llama3:latest' },   // BE → API/TS
  'A-03': { provider: 'ollama', model: 'llama3:latest' },   // DB → SQL
  'A-07': { provider: 'ollama', model: 'llama3:latest' },   // AI → prompt eng.

  // ── L2 DENETİM — inceleme: dengeli model ────────────────
  'B-01': { provider: 'ollama', model: 'llama3:latest' },   // KOD denetçi
  'B-02': { provider: 'ollama', model: 'llama3:latest' },   // DOĞRULAMA

  // ── L3 HAKEM — nihai karar: en güçlü ────────────────────
  'C-01': { provider: 'claude_code', model: null },          // HAKEM-1 → Claude
  'C-02': { provider: 'claude_code', model: null },          // HAKEM-2 → Claude

  // ── VARSAYILAN ──────────────────────────────────────────
  _varsayilan: { provider: 'ollama', model: 'llama3.2:1b' }, // Hafif/hızlı fallback
};


// ═══════════════════════════════════════════════════════════════
// 4. WORKER YAŞAM DÖNGÜSÜ
// ═══════════════════════════════════════════════════════════════

/**
 * Worker durumları:
 *   IDLE     → Bekliyor
 *   RUNNING  → Görev çalışıyor
 *   AUDITING → L2 denetimi bekliyor
 *   DONE     → Görev tamamlandı
 *   ERROR    → Hata oluştu
 */
const WORKER_DURUMLARI = {
  IDLE:     'IDLE',
  RUNNING:  'RUNNING',
  AUDITING: 'AUDITING',
  DONE:     'DONE',
  ERROR:    'ERROR',
};

/**
 * Tek bir ajan worker'ı. Görev alır, işler, sonuç üretir.
 */
class AgentWorker {
  /**
   * @param {string} agentId - AGENT_ID
   */
  constructor(agentId) {
    const matris = YETENEK_MATRISI[agentId];
    if (!matris) {
      throw new Error(`[WORKER_CORE] Bilinmeyen AGENT_ID: ${agentId}`);
    }

    this.agentId       = agentId;
    this.ad            = matris.ad;
    this.katman        = matris.katman;
    this.yetenekler    = matris.yetenekler;
    this.scraping      = matris.scraping;
    this.ai            = matris.ai;
    this.kural_tabanli = matris.kural_tabanli;
    this.ai_provider   = matris.ai_provider;
    this.beceriler     = matris.beceriler;
    this.araçlar       = matris.araçlar;
    this.max_iterasyon = matris.max_iterasyon;
    this.maliyet       = matris.maliyet_sinifi;
    this.durum         = WORKER_DURUMLARI.IDLE;

    // İstatistikler
    this._tamamlanan = 0;
    this._hata       = 0;
    this._son_aktif  = null;
  }

  /**
   * Görev çalıştır.
   * @param {string} gorev - Görev açıklaması
   * @returns {{ job_id: string, durum: string, sonuc: string, sure_ms: number, mod: string }}
   */
  async execute(gorev) {
    if (!gorev || gorev.trim().length < 3) {
      return { job_id: null, durum: 'RED', sonuc: 'Görev metni geçersiz (min 3 karakter)', sure_ms: 0, mod: 'YOK' };
    }

    const start = Date.now();
    const job_id = generateJobId(this.agentId);
    this.durum = WORKER_DURUMLARI.RUNNING;
    this._son_aktif = new Date().toISOString();

    try {
      let sonuc;
      let mod;

      // Çalışma modu seçimi
      if (this.kural_tabanli && !this.ai) {
        // Saf kural tabanlı
        mod = 'KURAL';
        sonuc = this._kuralTabanliYanit(gorev);
      } else if (this.ai && !this.kural_tabanli) {
        // Saf AI → Ollama veya Claude Code
        mod = 'AI';
        sonuc = await this._aiCagri(gorev);
      } else {
        // Hibrit — önce AI, fallback kurala
        mod = 'HIBRIT';
        try {
          sonuc = await this._aiCagri(gorev);
        } catch {
          sonuc = this._kuralTabanliYanit(gorev);
          mod = 'HIBRIT→KURAL';
        }
      }

      this.durum = WORKER_DURUMLARI.DONE;
      this._tamamlanan++;

      return {
        job_id,
        agent_id: this.agentId,
        agent_ad: this.ad,
        katman: this.katman,
        durum: 'TAMAM',
        sonuc,
        sure_ms: Date.now() - start,
        mod,
        maliyet: this.maliyet,
        scraping_kullanildi: this.scraping,
        ai_kullanildi: mod.includes('AI'),
        yetenekler: this.yetenekler,
        timestamp: new Date().toISOString(),
      };

    } catch (err) {
      this.durum = WORKER_DURUMLARI.ERROR;
      this._hata++;
      return {
        job_id,
        agent_id: this.agentId,
        agent_ad: this.ad,
        katman: this.katman,
        durum: 'HATA',
        sonuc: `HATA: ${err.message || String(err)}`,
        sure_ms: Date.now() - start,
        mod: 'HATA',
        maliyet: 'SIFIR',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Kural tabanlı deterministik yanıt üretir.
   * Maliyet: 0₺ | Gecikme: <5ms | AI bağımlılığı: SIFIR
   * @param {string} gorev
   * @returns {string}
   */
  _kuralTabanliYanit(gorev) {
    const ts = new Date().toISOString();

    // ═══════════════════════════════════════════════════════════
    // 3 KATMANLI VALİDASYON — Bağımsız Validator Servisi Kullanımı
    // ═══════════════════════════════════════════════════════════
    const sonuc = Validator.validateTask(
      gorev,
      this.beceriler,
      this.katman,
      this.araçlar.length,
      this.maliyet
    );

    return [
      `[KURAL-YANIT] ${this.ad} (${this.katman})`,
      `═════════════════════════════════════`,
      `AGENT_ID  : ${this.agentId}`,
      `GÖREV     : ${gorev.slice(0, 200)}`,
      `MOD       : Kural Tabanlı — 3 Katmanlı Validasyon (Validator.js)`,
      ``,
      `── KATMAN 1: TEKNİK ──`,
      ...sonuc.validasyon.teknik.map(s => `  ${s}`),
      `── KATMAN 2: GÖREV ──`,
      ...sonuc.validasyon.gorev.map(s => `  ${s}`),
      `── KATMAN 3: KANIT ──`,
      ...sonuc.validasyon.kanit.map(s => `  ${s}`),
      ``,
      `SKOR      : ${sonuc.skor}`,
      `KARAR     : ${sonuc.karar}`,
      `BECERİLER : ${this.beceriler.slice(0, 5).join(', ')}`,
      `ARAÇLAR   : ${this.araçlar.join(', ')}`,
      `MALİYET   : ${this.maliyet}`,
      `TARİH     : ${ts}`,
    ].join('\n');
  }

  /**
   * AI yanıt placeholder — gerçek AI entegrasyonu agentWorker.ts üzerinden çalışır.
   * @param {string} gorev
   * @returns {string}
   */
  async _aiCagri(gorev) {
    const ts = new Date().toISOString();

    // ── Provider seçimi ──────────────────────────────────
    const provSec = AI_PROVIDER_SECIMI[this.agentId] || AI_PROVIDER_SECIMI._varsayilan;
    const provider = provSec.provider;
    const model = provSec.model;

    try {
      if (provider === 'ollama') {
        return await this._ollamaCagri(gorev, model);
      } else if (provider === 'claude_code') {
        return await this._claudeCodeCagri(gorev);
      } else {
        // Bilinmeyen provider → kural tabanlı fallback
        return this._kuralTabanliYanit(gorev);
      }
    } catch (err) {
      // AI başarısız → kural tabanlı fallback (hiç crash yok)
      return [
        `[AI-FALLBACK] ${this.ad} (${this.katman})`,
        `─────────────────────────────────`,
        `AGENT_ID  : ${this.agentId}`,
        `PROVIDER  : ${provider} (HATA → kural fallback)`,
        `HATA      : ${err.message || String(err)}`,
        `GÖREV     : ${gorev.slice(0, 200)}`,
        `DURUM     : AI başarısız, kural tabanlı çalıştı`,
        `TARİH     : ${ts}`,
        `GÖREV TAMAM: Fallback ile tamamlandı`,
      ].join('\n');
    }
  }

  /**
   * Ollama lokal LLM çağrısı — localhost:11434
   * Maliyet: ₺0 | Tamamen lokal
   * @param {string} gorev
   * @param {string} model
   * @returns {Promise<string>}
   */
  async _ollamaCagri(gorev, model = 'llama3') {
    const http = require('http');
    const OLLAMA_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

    const sistemPrompt = `Sen ${this.ad} (${this.agentId}) ajanısın. Katman: ${this.katman}. ` +
      `Becerilerin: ${this.beceriler.join(', ')}. ` +
      `Görevini kısa, net ve Türkçe yanıtla. Sadece sonuç ver.`;

    const payload = JSON.stringify({
      model,
      prompt: `${sistemPrompt}\n\nGÖREV: ${gorev}`,
      stream: false,
      options: { temperature: 0.3, num_predict: 512 },
    });

    return new Promise((resolve, reject) => {
      const url = new URL(`${OLLAMA_URL}/api/generate`);
      const req = http.request({
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000,
      }, (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            resolve([
              `[AI-OLLAMA] ${this.ad} (${this.katman})`,
              `─────────────────────────────────`,
              `AGENT_ID  : ${this.agentId}`,
              `MODEL     : ${model}`,
              `GÖREV     : ${gorev.slice(0, 200)}`,
              `─── YANIT ───`,
              data.response || '[boş yanıt]',
              `─────────────`,
              `SÜRE      : ${data.total_duration ? Math.round(data.total_duration / 1e6) + 'ms' : '?'}`,
              `TOKEN     : ${data.eval_count || '?'}`,
              `MALİYET   : SIFIR (lokal)`,
              `TARİH     : ${new Date().toISOString()}`,
            ].join('\n'));
          } catch (e) {
            reject(new Error(`Ollama JSON parse hatası: ${e.message}`));
          }
        });
      });

      req.on('error', (e) => reject(new Error(`Ollama bağlantı hatası: ${e.message}`)));
      req.on('timeout', () => { req.destroy(); reject(new Error('Ollama timeout (60s)')); });
      req.write(payload);
      req.end();
    });
  }

  /**
   * Claude Code terminal AI çağrısı — lokal CLI
   * Maliyet: Claude Code abonelik (mevcut)
   * @param {string} gorev
   * @returns {Promise<string>}
   */
  async _claudeCodeCagri(gorev) {
    const { execSync } = require('child_process');
    const ts = new Date().toISOString();

    try {
      // Claude Code'a kısa print modunda sor
      const cmd = `claude -p "${gorev.replace(/"/g, '\\"').slice(0, 500)}"`;
      const sonuc = execSync(cmd, {
        timeout: 120000,
        encoding: 'utf-8',
        maxBuffer: 1024 * 1024,
        windowsHide: true,
      }).trim();

      return [
        `[AI-CLAUDE] ${this.ad} (${this.katman})`,
        `─────────────────────────────────`,
        `AGENT_ID  : ${this.agentId}`,
        `PROVIDER  : Claude Code (terminal)`,
        `GÖREV     : ${gorev.slice(0, 200)}`,
        `─── YANIT ───`,
        sonuc.slice(0, 2000),
        `─────────────`,
        `MALİYET   : SIFIR (mevcut abonelik)`,
        `TARİH     : ${ts}`,
      ].join('\n');
    } catch (err) {
      throw new Error(`Claude Code hatası: ${err.message || String(err)}`);
    }
  }

  /**
   * Worker istatistikleri.
   */
  istatistikler() {
    return {
      agent_id:     this.agentId,
      ad:           this.ad,
      katman:       this.katman,
      durum:        this.durum,
      tamamlanan:   this._tamamlanan,
      hata:         this._hata,
      son_aktif:    this._son_aktif,
      yetenekler:   this.yetenekler,
      scraping:     this.scraping,
      ai:           this.ai,
      maliyet:      this.maliyet,
    };
  }
}


// ═══════════════════════════════════════════════════════════════
// 5. WORKER HAVUZU — Tüm Ajanları Yöneten Merkez
// ═══════════════════════════════════════════════════════════════

class WorkerPool {
  constructor() {
    /** @type {Map<string, AgentWorker>} */
    this._workers = new Map();

    // Tüm yetenek matrisindeki ajanları havuza ekle
    for (const agentId of Object.keys(YETENEK_MATRISI)) {
      this._workers.set(agentId, new AgentWorker(agentId));
    }
  }

  /**
   * Belirli bir ajan worker'ını döndürür.
   * @param {string} agentId
   * @returns {AgentWorker|null}
   */
  get(agentId) {
    return this._workers.get(agentId) || null;
  }

  /**
   * Tüm worker'ların listesini döndürür.
   * @returns {AgentWorker[]}
   */
  tumu() {
    return Array.from(this._workers.values());
  }

  /**
   * Katmana göre filtrele.
   * @param {string} katman
   * @returns {AgentWorker[]}
   */
  katmanaGore(katman) {
    return this.tumu().filter(w => w.katman === katman);
  }

  /**
   * Scraping yeteneği olan ajanları döndürür.
   * @returns {AgentWorker[]}
   */
  scrapingYetenekli() {
    return this.tumu().filter(w => w.scraping);
  }

  /**
   * AI yeteneği olan ajanları döndürür.
   * @returns {AgentWorker[]}
   */
  aiYetenekli() {
    return this.tumu().filter(w => w.ai);
  }

  /**
   * Sıfır maliyetli (kural tabanlı) ajanları döndürür.
   * @returns {AgentWorker[]}
   */
  sifirMaliyetli() {
    return this.tumu().filter(w => w.maliyet === 'SIFIR');
  }

  /**
   * Havuz istatistikleri.
   */
  istatistikler() {
    const workers = this.tumu();
    return {
      toplam:            workers.length,
      aktif:             workers.filter(w => w.durum === WORKER_DURUMLARI.RUNNING).length,
      scraping_sayisi:   workers.filter(w => w.scraping).length,
      ai_sayisi:         workers.filter(w => w.ai).length,
      kural_sayisi:      workers.filter(w => w.kural_tabanli && !w.ai).length,
      hibrit_sayisi:     workers.filter(w => w.ai && w.kural_tabanli).length,
      toplam_tamamlanan: workers.reduce((a, w) => a + w._tamamlanan, 0),
      toplam_hata:       workers.reduce((a, w) => a + w._hata, 0),
      sifir_maliyet:     workers.filter(w => w.maliyet === 'SIFIR').length,
      katman_dagilimi: {
        KOMUTA:  workers.filter(w => w.katman === 'KOMUTA').length,
        L1:      workers.filter(w => w.katman === 'L1').length,
        L2:      workers.filter(w => w.katman === 'L2').length,
        L3:      workers.filter(w => w.katman === 'L3').length,
        DESTEK:  workers.filter(w => w.katman === 'DESTEK').length,
        OZEL:    workers.filter(w => w.katman === 'OZEL').length,
        KONTROL: workers.filter(w => w.katman === 'KONTROL').length,
      },
    };
  }
}


// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
  // AGENT_ID sistemi
  generateAgentId,
  parseAgentId,
  generateJobId,

  // Yetenek matrisi
  YETENEK_TIPLERI,
  YETENEK_MATRISI,

  // AI Provider
  AI_PROVIDER_SECIMI,

  // Beceri eşleştirme
  eslestir,

  // Worker sınıfları
  AgentWorker,
  WorkerPool,

  // Sabitler
  KATMAN_PREFIX,
  WORKER_DURUMLARI,
};
