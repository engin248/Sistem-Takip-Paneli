// ============================================================
// AGENT REGISTRY â€” 50 KÄ°ÅÄ°LÄ°K HÄ°BRÄ°T KADRO
// ============================================================
// 4 Komuta + 10 L1 Ä°craatÃ§Ä± + 6 L2 DenetÃ§i + 2 L3 Hakem
// + 28 Destek UzmanÄ± = 50 Ajan
//
// Katman hiyerarÅŸisi:
//   KOMUTA â†’ Strateji, karar, gÃ¼venlik, koordinasyon
//   L1     â†’ DoÄŸrudan icraat (kod, DB, bot, AI, test, gÃ¼venlik...)
//   L2     â†’ Denetim, doÄŸrulama, kalite kontrolÃ¼
//   L3     â†’ Hakem, Ã§eliÅŸki Ã§Ã¶zÃ¼mÃ¼, nihai karar
//   DESTEK â†’ AltyapÄ±, otomasyon, hafÄ±za, iletiÅŸim, analitik
//
// Hata KodlarÄ±:
//   ERR-STP001-045 â†’ Ajan bulunamadÄ±
//   ERR-STP001-046 â†’ Ajan kaydÄ± baÅŸarÄ±sÄ±z
//   ERR-STP001-047 â†’ Ajan gÃ¼ncelleme hatasÄ±
// ============================================================

import { ERR, processError } from '@/lib/errorCore';
import { logAudit } from './auditService';
import { supabase, validateSupabaseConnection } from '@/lib/supabase';

// â”€â”€â”€ TÄ°P TANIMLARI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type AgentTier = 'KOMUTA' | 'L1' | 'L2' | 'L3' | 'DESTEK';
export type AgentStatus = 'aktif' | 'pasif' | 'bakimda' | 'egitimde' | 'devre_disi';

export interface AgentCard {
  /** Benzersiz ajan kimliÄŸi */
  id: string;
  /** Ajan kod adÄ± */
  kod_adi: string;
  /** Rol aÃ§Ä±klamasÄ± */
  rol: string;
  /** Ait olduÄŸu katman */
  katman: AgentTier;
  /** YapabildiÄŸi gÃ¶rev tipleri */
  beceri_listesi: string[];
  /** YapamayacaÄŸÄ± gÃ¶rev tipleri */
  kapsam_siniri: string[];
  /** Yeni kural/bilgi enjekte edilebilir mi? */
  ogrenme_kapasitesi: boolean;
  /** BaÄŸlÄ± olduÄŸu servisler */
  bagimliliklari: string[];
  /** Mevcut durum */
  durum: AgentStatus;
  /** Toplam tamamlanan gÃ¶rev sayÄ±sÄ± */
  tamamlanan_gorev: number;
  /** Toplam hata sayÄ±sÄ± */
  hata_sayisi: number;
  /** Son aktif olma zamanÄ± */
  son_aktif: string;
  /** OluÅŸturulma zamanÄ± */
  olusturulma: string;
  /** Klon kaynaÄŸÄ± (klonlanmÄ±ÅŸsa) */
  klon_kaynagi?: string;
  /** Ek metadata */
  metadata?: Record<string, unknown>;
}

// â”€â”€â”€ 50 KÄ°ÅÄ°LÄ°K KADRO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const DEFAULT_ROSTER: AgentCard[] = [

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // KOMUTA KADROSU (4) â€” Strateji, Karar, Ä°stihbarat, GÃ¼venlik
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  {
    id: 'K-1', kod_adi: 'KOMUTAN',
    rol: 'TuÄŸgeneral â€” Son karar otoritesi, KABUL/RED yetkisi, operasyon komutanÄ±',
    katman: 'KOMUTA',
    beceri_listesi: ['karar_verme', 'onay_red', 'strateji', 'ekip_yonetimi', 'onceliklendirme', 'operasyon_komutasi', 'gorev_atama', 'kriz_yonetimi'],
    kapsam_siniri: ['kod_yazma', 'dosya_duzenleme', 'veritabani_islemleri'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['telegramService', 'auditService'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'K-2', kod_adi: 'KURMAY',
    rol: 'Strateji ve iÅŸ planÄ± Ã¼retici, Ã¶nceliklendirme motoru, kaynak daÄŸÄ±lÄ±mÄ±',
    katman: 'KOMUTA',
    beceri_listesi: ['is_plani_uretme', 'onceliklendirme', 'risk_analizi', 'kaynak_planlama', 'zaman_cizelgesi', 'strateji', 'senaryo_analizi'],
    kapsam_siniri: ['kod_yazma', 'dosya_duzenleme'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['aiManager', 'auditService'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'K-3', kod_adi: 'Ä°STÄ°HBARAT',
    rol: 'Veri toplama, AR-GE, trend analizi, dÄ±ÅŸ kaynak izleme, tehdit istihbaratÄ±',
    katman: 'KOMUTA',
    beceri_listesi: ['veri_toplama', 'trend_analizi', 'arge_arastirma', 'kaynak_tarama', 'rapor_uretme', 'pattern_analizi', 'tehdit_analizi'],
    kapsam_siniri: ['kod_yazma', 'karar_verme'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['bridgeService', 'selfLearningEngine', 'auditService'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'K-4', kod_adi: 'MUHAFIZ',
    rol: 'GÃ¼venlik, izolasyon, yetki kontrolÃ¼, veri koruma, saldÄ±rÄ± Ã¶nleme',
    katman: 'KOMUTA',
    beceri_listesi: ['guvenlik_denetimi', 'yetki_kontrolu', 'izolasyon', 'veri_koruma', 'rls_yonetimi', 'saldiri_tespiti', 'zero_trust'],
    kapsam_siniri: ['is_plani', 'strateji', 'frontend_gelistirme'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['authService', 'auditService', 'alarmService'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // L1 Ä°CRAATÃ‡I AJANLAR (10) â€” DoÄŸrudan Uygulama KatmanÄ±
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  {
    id: 'A-01', kod_adi: 'Ä°CRACI-FE',
    rol: 'Frontend geliÅŸtirme â€” React, Next.js, UI/UX, responsive tasarÄ±m',
    katman: 'L1',
    beceri_listesi: ['react', 'nextjs', 'typescript', 'css', 'ui_ux', 'component_gelistirme', 'responsive_tasarim', 'animasyon'],
    kapsam_siniri: ['veritabani_islemleri', 'guvenlik_denetimi'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['dosya_sistemi'],
    durum: 'pasif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'A-02', kod_adi: 'Ä°CRACI-BE',
    rol: 'Backend geliÅŸtirme â€” API, servisler, iÅŸ mantÄ±ÄŸÄ±, Next.js route handler',
    katman: 'L1',
    beceri_listesi: ['api_gelistirme', 'typescript', 'nextjs_api_routes', 'is_mantigi', 'servis_yazma', 'entegrasyon', 'rest_api'],
    kapsam_siniri: ['frontend_tasarim', 'guvenlik_denetimi'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['dosya_sistemi', 'supabase'],
    durum: 'pasif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'A-03', kod_adi: 'Ä°CRACI-DB',
    rol: 'VeritabanÄ± iÅŸlemleri â€” Supabase, PostgreSQL, migration, RLS policy tasarÄ±mÄ±',
    katman: 'L1',
    beceri_listesi: ['supabase', 'postgresql', 'sql', 'migration', 'rls_policy', 'schema_tasarimi', 'veri_modelleme', 'indeks_optimizasyonu'],
    kapsam_siniri: ['frontend_tasarim', 'ui_ux'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['supabase'],
    durum: 'pasif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'A-04', kod_adi: 'Ä°CRACI-BOT',
    rol: 'Telegram bot geliÅŸtirme â€” grammy, webhook, komut iÅŸleme, bildirim',
    katman: 'L1',
    beceri_listesi: ['telegram_api', 'bot_gelistirme', 'grammy', 'webhook', 'komut_isleme', 'bildirim_gonderme', 'inline_keyboard'],
    kapsam_siniri: ['frontend_tasarim', 'veritabani_islemleri'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['telegramService', 'telegramNotifier'],
    durum: 'pasif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'A-05', kod_adi: 'Ä°CRACI-TEST',
    rol: 'Test yazma ve kalite gÃ¼vencesi â€” unit, integration, e2e, Vitest, Playwright',
    katman: 'L1',
    beceri_listesi: ['vitest', 'playwright', 'unit_test', 'integration_test', 'e2e_test', 'test_yazma', 'coverage', 'mock_stub'],
    kapsam_siniri: ['karar_verme', 'dosya_silme', 'deployment'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['dosya_sistemi'],
    durum: 'pasif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'A-06', kod_adi: 'Ä°CRACI-SEC',
    rol: 'GÃ¼venlik geliÅŸtirme â€” penetrasyon testi, kriptografi, OWASP, token yÃ¶netimi',
    katman: 'L1',
    beceri_listesi: ['penetrasyon_testi', 'kriptografi', 'owasp', 'token_yonetimi', 'jwt', 'sifreleme', 'hash', 'xss_sqli_onleme'],
    kapsam_siniri: ['ui_ux', 'is_plani'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['authService', 'auditService'],
    durum: 'pasif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'A-07', kod_adi: 'Ä°CRACI-AI',
    rol: 'AI/ML iÅŸlemleri â€” Ollama, model yÃ¶netimi, prompt engineering, analiz',
    katman: 'L1',
    beceri_listesi: ['ollama', 'llm', 'prompt_engineering', 'ai_entegrasyon', 'model_yonetimi', 'nlp', 'embedding', 'rag'],
    kapsam_siniri: ['veritabani_degistirme', 'deployment', 'guvenlik_denetimi'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['aiManager', 'selfLearningEngine'],
    durum: 'pasif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'A-08', kod_adi: 'Ä°CRACI-DATA',
    rol: 'Veri analizi ve ETL â€” veri dÃ¶nÃ¼ÅŸÃ¼mÃ¼, aggregation, raporlama, pipeline',
    katman: 'L1',
    beceri_listesi: ['veri_analizi', 'etl', 'aggregation', 'veri_donusumu', 'raporlama', 'grafik', 'istatistik', 'csv_json_parse'],
    kapsam_siniri: ['frontend_tasarim', 'karar_verme'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['supabase', 'bridgeService'],
    durum: 'pasif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'A-09', kod_adi: 'Ä°CRACI-INFRA',
    rol: 'AltyapÄ± ve DevOps â€” Docker, Vercel, ortam yÃ¶netimi, environment konfigÃ¼rasyonu',
    katman: 'L1',
    beceri_listesi: ['docker', 'vercel', 'ortam_yonetimi', 'environment', 'ci_cd', 'monitoring', 'log_yonetimi', 'uptime'],
    kapsam_siniri: ['frontend_tasarim', 'ui_ux'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['dosya_sistemi', 'auditService'],
    durum: 'pasif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'A-10', kod_adi: 'Ä°CRACI-AKIÅ',
    rol: 'Ä°ÅŸ akÄ±ÅŸÄ± ve otomasyon â€” pipeline orchestration, event-driven, cron iÅŸler',
    katman: 'L1',
    beceri_listesi: ['workflow_orchestration', 'event_driven', 'cron', 'pipeline_tasarimi', 'otomasyon', 'tetikleyici', 'webhook_yonetimi'],
    kapsam_siniri: ['frontend_tasarim', 'guvenlik_denetimi'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['auditService', 'alarmService'],
    durum: 'pasif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // L2 DENETÃ‡Ä° AJANLAR (6) â€” Kalite ve DoÄŸrulama KatmanÄ±
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  {
    id: 'B-01', kod_adi: 'DENETÃ‡Ä°-KOD',
    rol: 'Kod denetimi â€” standartlara uyum, lint, tip gÃ¼venliÄŸi, mimari doÄŸrulama',
    katman: 'L2',
    beceri_listesi: ['kod_inceleme', 'standart_kontrolu', 'lint', 'tip_guvenligi', 'mimari_dogrulama', 'clean_code', 'solid_prensip'],
    kapsam_siniri: ['kod_yazma', 'dosya_olusturma', 'karar_verme'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['auditService'],
    durum: 'pasif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'B-02', kod_adi: 'DENETÃ‡Ä°-DOÄRULA',
    rol: '5 eksen doÄŸrulama â€” teknik, gÃ¼venlik, performans, operasyonel, UX',
    katman: 'L2',
    beceri_listesi: ['teknik_dogrulama', 'guvenlik_dogrulama', 'performans_dogrulama', 'operasyonel_dogrulama', 'ux_dogrulama', 'bes_eksen_analiz'],
    kapsam_siniri: ['kod_yazma', 'dosya_olusturma'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['auditService', 'consensusEngine'],
    durum: 'pasif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'B-03', kod_adi: 'DENETÃ‡Ä°-GÃœVENLÄ°K',
    rol: 'GÃ¼venlik denetimi â€” zaafiyet tarama, RLS kontrolÃ¼, saldÄ±rÄ± senaryolarÄ±',
    katman: 'L2',
    beceri_listesi: ['zaafiyet_tarama', 'rls_kontrol', 'red_team_simulasyon', 'owasp_denetim', 'ssl_kontrol', 'dependency_audit'],
    kapsam_siniri: ['kod_yazma', 'deployment', 'karar_verme'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['auditService', 'alarmService'],
    durum: 'pasif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'B-04', kod_adi: 'DENETÃ‡Ä°-PERF',
    rol: 'Performans denetimi â€” Core Web Vitals, latency analizi, bellek sÄ±zÄ±ntÄ±sÄ± tespiti',
    katman: 'L2',
    beceri_listesi: ['core_web_vitals', 'latency_analizi', 'bellek_analizi', 'profiling', 'benchmark', 'cache_kontrol', 'db_sorgu_analizi'],
    kapsam_siniri: ['kod_yazma', 'ui_tasarim', 'is_plani'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['auditService'],
    durum: 'pasif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'B-05', kod_adi: 'DENETÃ‡Ä°-VERÄ°',
    rol: 'Veri bÃ¼tÃ¼nlÃ¼ÄŸÃ¼ denetimi â€” schema uyumu, veri kalitesi, tutarlÄ±lÄ±k kontrolÃ¼',
    katman: 'L2',
    beceri_listesi: ['schema_dogrulama', 'veri_kalitesi', 'tutarlilik_kontrolu', 'duplicate_tespiti', 'null_analizi', 'format_dogrulama'],
    kapsam_siniri: ['kod_yazma', 'frontend_tasarim', 'karar_verme'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['supabase', 'auditService'],
    durum: 'pasif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'B-06', kod_adi: 'DENETÃ‡Ä°-UX',
    rol: 'UX/UI denetimi â€” eriÅŸilebilirlik, kullanÄ±labilirlik, WCAG uyumu, renk analizi',
    katman: 'L2',
    beceri_listesi: ['erisim_analizi', 'kullanilabilirlik', 'wcag_uyumu', 'renk_kontrastÄ±', 'navigasyon_analizi', 'responsive_kontrol'],
    kapsam_siniri: ['kod_yazma', 'veritabani_islemleri', 'karar_verme'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['auditService'],
    durum: 'pasif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // L3 HAKEM AJANLAR (2) â€” Nihai Karar ve Ã‡eliÅŸki Ã‡Ã¶zÃ¼mÃ¼
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  {
    id: 'C-01', kod_adi: 'HAKEM-1',
    rol: 'L1-L2 Ã§eliÅŸki Ã§Ã¶zÃ¼mÃ¼, nihai teknik karar, kanÄ±t deÄŸerlendirme',
    katman: 'L3',
    beceri_listesi: ['celiskilik_cozum', 'nihai_karar', 'konsensus', 'uzlasi', 'kanit_degerlendirme', 'bes_eksen_analiz'],
    kapsam_siniri: ['kod_yazma', 'dosya_olusturma', 'is_plani'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['consensusEngine', 'auditService'],
    durum: 'pasif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'C-02', kod_adi: 'HAKEM-2',
    rol: 'Stratejik hakem â€” uzun vadeli kararlar, mimari seÃ§imler, Ã¶nceliklendirme',
    katman: 'L3',
    beceri_listesi: ['stratejik_karar', 'mimari_secim', 'uzun_vade_planlama', 'risk_degerlendirme', 'alternatifleri_analiz'],
    kapsam_siniri: ['kod_yazma', 'dosya_olusturma'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['consensusEngine', 'auditService', 'boardService'],
    durum: 'pasif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // DESTEK AJANLARI (28) â€” AltyapÄ± ve UzmanlÄ±k Hizmetleri
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  {
    id: 'D-01', kod_adi: 'MÃœHÃœRDAR',
    rol: 'Audit loglama, mÃ¼hÃ¼rleme, arÅŸivleme, SHA-256 kanÄ±t Ã¼retimi',
    katman: 'DESTEK',
    beceri_listesi: ['audit_loglama', 'muhurleme', 'arsivleme', 'sha256_hash', 'kanit_toplama', 'tutanak_olusturma'],
    kapsam_siniri: ['kod_yazma', 'is_plani', 'karar_verme'],
    ogrenme_kapasitesi: false,
    bagimliliklari: ['auditService', 'boardService'],
    durum: 'pasif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'D-02', kod_adi: 'OTOMASYON',
    rol: 'CI/CD, deployment, git iÅŸlemleri, Vercel deploy, GitHub Actions yÃ¶netimi',
    katman: 'DESTEK',
    beceri_listesi: ['ci_cd', 'deployment', 'git_islemleri', 'vercel_deploy', 'github_actions', 'otomasyon'],
    kapsam_siniri: ['frontend_tasarim', 'guvenlik_denetimi'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['dosya_sistemi', 'git'],
    durum: 'pasif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'D-03', kod_adi: 'ARGE-A0',
    rol: 'AraÅŸtÄ±rma birincil â€” trend analizi, beceri haritasÄ±, pazar araÅŸtÄ±rmasÄ±',
    katman: 'DESTEK',
    beceri_listesi: ['arastirma', 'analiz', 'rapor_uretme', 'veri_siniflandirma', 'trend_analizi', 'beceri_haritasi'],
    kapsam_siniri: ['kod_yazma', 'veritabani_degistirme', 'terminal_komutu'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['bridgeService'],
    durum: 'pasif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'D-04', kod_adi: 'KÃ–PRÃœ',
    rol: 'DÄ±ÅŸ sistem entegrasyonu â€” harici API, SKM kÃ¶prÃ¼sÃ¼, veri senkronizasyon',
    katman: 'DESTEK',
    beceri_listesi: ['dis_sistem_baglantisi', 'api_entegrasyon', 'veri_senkronizasyon', 'saglik_kontrolu', 'latency_izleme'],
    kapsam_siniri: ['kod_yazma', 'frontend_tasarim', 'karar_verme'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['bridgeService', 'auditService'],
    durum: 'pasif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'D-05', kod_adi: 'NÃ–BETÃ‡Ä°',
    rol: 'Alarm ve monitoring â€” 7/24 sistem izleme, anomali tespiti, eÅŸik kontrolÃ¼',
    katman: 'DESTEK',
    beceri_listesi: ['alarm_yonetimi', 'monitoring', 'saglik_kontrolu', 'anomali_tespiti', 'bildirim_gonderme', 'esik_izleme'],
    kapsam_siniri: ['kod_yazma', 'is_plani', 'frontend_tasarim'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['alarmService', 'telegramNotifier', 'auditService'],
    durum: 'pasif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'D-06', kod_adi: 'DOKÃœMANTER',
    rol: 'Teknik dokÃ¼mantasyon â€” README, API docs, ÅŸema diyagramlarÄ±, deÄŸiÅŸiklik gÃ¼nlÃ¼ÄŸÃ¼',
    katman: 'DESTEK',
    beceri_listesi: ['readme_yazimi', 'api_dokumantasyonu', 'diyagram_olusturma', 'changelog', 'wiki_yonetimi', 'teknik_yazarlik'],
    kapsam_siniri: ['kod_yazma', 'veritabani_islemleri', 'karar_verme'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['dosya_sistemi'],
    durum: 'pasif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'D-07', kod_adi: 'HAFIZA',
    rol: 'Sistem hafÄ±zasÄ± â€” uzun sÃ¼reli baÄŸlam, Ã¶nceki kararlar, pattern arÅŸivi',
    katman: 'DESTEK',
    beceri_listesi: ['baglam_yonetimi', 'uzun_donem_hafiza', 'pattern_arsivi', 'karar_gecmisi', 'oturum_yonetimi'],
    kapsam_siniri: ['kod_yazma', 'frontend_tasarim', 'deployment'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['supabase', 'selfLearningEngine'],
    durum: 'pasif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'D-08', kod_adi: 'HABERCÄ°',
    rol: 'Bildirim hub â€” Telegram, email, webhook bildirim orkestrasyonu',
    katman: 'DESTEK',
    beceri_listesi: ['telegram_bildirim', 'email_bildirim', 'webhook_bildirim', 'bildirim_onceliklendirme', 'kanal_secimi'],
    kapsam_siniri: ['kod_yazma', 'veritabani_islemleri', 'karar_verme'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['telegramNotifier', 'auditService'],
    durum: 'pasif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'D-09', kod_adi: 'ANALÄ°ST',
    rol: 'Ä°statistik ve metrik analizi â€” KPI takibi, trend grafikleri, karar destek',
    katman: 'DESTEK',
    beceri_listesi: ['kpi_takibi', 'istatistik_analizi', 'trend_grafik', 'karar_destek', 'metrik_hesaplama', 'dashboard_veri'],
    kapsam_siniri: ['kod_yazma', 'frontend_tasarim'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['supabase', 'bridgeService'],
    durum: 'pasif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'D-10', kod_adi: 'PLANLAYICI',
    rol: 'Proje planlama â€” sprint, milestone, gÃ¶rev aÄŸacÄ±, baÄŸÄ±mlÄ±lÄ±k haritasÄ±',
    katman: 'DESTEK',
    beceri_listesi: ['sprint_planlama', 'milestone_yonetimi', 'gorev_agaci', 'bagimlilik_haritasi', 'gantt', 'kaynak_tahsisi'],
    kapsam_siniri: ['kod_yazma', 'veritabani_islemleri'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['supabase', 'auditService'],
    durum: 'pasif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'D-11', kod_adi: 'Ã‡EVÄ°RMEN',
    rol: 'Ã‡ok dilli destek â€” i18n, TR/EN/AR Ã§eviri, RTL uyumu, yerelleÅŸtirme',
    katman: 'DESTEK',
    beceri_listesi: ['i18n', 'ceviri', 'yerellestime', 'rtl_destek', 'kulturel_uyum', 'dil_kontrolu'],
    kapsam_siniri: ['kod_yazma', 'veritabani_islemleri', 'karar_verme'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['dosya_sistemi'],
    durum: 'pasif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'D-12', kod_adi: 'YEDEKÃ‡I',
    rol: 'Yedek ve kurtarma â€” otomatik yedek, felaket kurtarma, rollback, snapshot',
    katman: 'DESTEK',
    beceri_listesi: ['otomatik_yedek', 'felakat_kurtarma', 'rollback', 'snapshot', 'veri_kurtarma', 'replikasyon'],
    kapsam_siniri: ['frontend_tasarim', 'ui_ux', 'karar_verme'],
    ogrenme_kapasitesi: false,
    bagimliliklari: ['supabase', 'dosya_sistemi'],
    durum: 'pasif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'D-13', kod_adi: 'Ã–NBELLEK',
    rol: 'Cache yÃ¶netimi â€” Redis, in-memory cache, TTL stratejisi, invalidasyon',
    katman: 'DESTEK',
    beceri_listesi: ['cache_yonetimi', 'ttl_stratejisi', 'invalidasyon', 'redis', 'in_memory_cache', 'cdn_yonetimi'],
    kapsam_siniri: ['frontend_tasarim', 'is_plani', 'karar_verme'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['supabase'],
    durum: 'pasif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'D-14', kod_adi: 'OPTÄ°MÄ°ZÃ–R',
    rol: 'Sistem optimizasyonu â€” algoritma iyileÅŸtirme, DB sorgu, bundle kÃ¼Ã§Ã¼ltme',
    katman: 'DESTEK',
    beceri_listesi: ['algoritma_iyilestirme', 'db_sorgu_optimizasyon', 'bundle_kucultme', 'lazy_loading', 'kod_profiling'],
    kapsam_siniri: ['is_plani', 'karar_verme', 'guvenlik_denetimi'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['auditService'],
    durum: 'pasif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'D-15', kod_adi: 'DEDEKTÄ°F',
    rol: 'Hata ayÄ±klama ve kÃ¶k neden analizi â€” stack trace, log analizi, reproduksiyon',
    katman: 'DESTEK',
    beceri_listesi: ['hata_ayiklama', 'kok_neden_analizi', 'stack_trace', 'log_analizi', 'reproduksiyon', 'bug_report'],
    kapsam_siniri: ['frontend_tasarim', 'deployment', 'is_plani'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['auditService', 'selfLearningEngine'],
    durum: 'pasif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'D-16', kod_adi: 'KORDÄ°NATÃ–R',
    rol: 'Ajan koordinasyonu â€” gÃ¶rev daÄŸÄ±lÄ±mÄ±, iÅŸ kuyruÄŸu, kapasite yÃ¶netimi',
    katman: 'DESTEK',
    beceri_listesi: ['gorev_dagitimi', 'is_kuyrugu', 'kapasite_yonetimi', 'ajan_koordinasyon', 'paralel_yurutme'],
    kapsam_siniri: ['kod_yazma', 'frontend_tasarim'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['auditService'],
    durum: 'pasif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'D-17', kod_adi: 'SÄ°NYAL',
    rol: 'Event sistemi â€” pub/sub, event bus, gerÃ§ek zamanlÄ± bildirim, SSE/WebSocket',
    katman: 'DESTEK',
    beceri_listesi: ['pub_sub', 'event_bus', 'gercek_zamanli', 'sse', 'websocket', 'event_sourcing'],
    kapsam_siniri: ['karar_verme', 'veritabani_degistirme', 'guvenlik_denetimi'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['telegramNotifier', 'auditService'],
    durum: 'pasif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'D-18', kod_adi: 'KURAL-MOT',
    rol: 'Kural motoru â€” iÅŸ kurallarÄ±, politika uygulama, uyum denetimi',
    katman: 'DESTEK',
    beceri_listesi: ['is_kurallari', 'politika_uygulama', 'uyum_denetimi', 'karar_agaci', 'kural_motoru'],
    kapsam_siniri: ['frontend_tasarim', 'veritabani_islemleri'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['auditService', 'consensusEngine'],
    durum: 'pasif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'D-19', kod_adi: 'RAPORCU',
    rol: 'Raporlama motoru â€” otomatik rapor, PDF/CSV/JSON export, periyodik Ã¶zet',
    katman: 'DESTEK',
    beceri_listesi: ['rapor_uretme', 'pdf_export', 'csv_export', 'json_export', 'periyodik_ozet', 'tablo_olusturma'],
    kapsam_siniri: ['kod_yazma', 'karar_verme', 'deployment'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['supabase', 'auditService'],
    durum: 'pasif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'D-20', kod_adi: 'FORMATÃ–R',
    rol: 'Standart ve format â€” kod stili, naming convention, ÅŸema standardizasyon',
    katman: 'DESTEK',
    beceri_listesi: ['kod_stili', 'naming_convention', 'sema_standardizasyon', 'prettier', 'eslint_konfig', 'format_belirleme'],
    kapsam_siniri: ['karar_verme', 'deployment', 'guvenlik_denetimi'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['dosya_sistemi'],
    durum: 'pasif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'D-21', kod_adi: 'TETÄ°KÃ‡Ä°',
    rol: 'ZamanlayÄ±cÄ± ve tetikleyici â€” cron jobs, zamanlÄ± gÃ¶rev, bekleme yÃ¶netimi',
    katman: 'DESTEK',
    beceri_listesi: ['cron_jobs', 'zamanli_gorev', 'bekleme_yonetimi', 'gecikme_kontrol', 'tekrar_deneme', 'timeout'],
    kapsam_siniri: ['frontend_tasarim', 'karar_verme', 'is_plani'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['auditService'],
    durum: 'pasif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'D-22', kod_adi: 'ARABULUCU',
    rol: 'Ã‡atÄ±ÅŸma Ã§Ã¶zÃ¼mÃ¼ â€” versiyon Ã§akÄ±ÅŸmasÄ±, merge conflict, anlaÅŸmazlÄ±k yÃ¶netimi',
    katman: 'DESTEK',
    beceri_listesi: ['catisma_cozumu', 'merge_conflict', 'anlasmazlik_yonetimi', 'uzlasma', 'versiyonlama'],
    kapsam_siniri: ['kod_yazma', 'deployment', 'veritabani_islemleri'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['auditService'],
    durum: 'pasif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'D-23', kod_adi: 'MÃœHENDÄ°S',
    rol: 'Sistem mÃ¼hendisliÄŸi â€” mimari tasarÄ±m, teknik borÃ§ yÃ¶netimi, refactoring',
    katman: 'DESTEK',
    beceri_listesi: ['mimari_tasarim', 'teknik_borc_yonetimi', 'refactoring', 'sistem_tasarimi', 'pattern_secimi', 'moduler_yapi'],
    kapsam_siniri: ['frontend_tasarim', 'is_plani'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['dosya_sistemi', 'auditService'],
    durum: 'pasif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'D-24', kod_adi: 'KEÅFEDEN',
    rol: 'Yeni teknoloji keÅŸfi â€” kÃ¼tÃ¼phane araÅŸtÄ±rma, alternatif Ã§Ã¶zÃ¼m, POC Ã¼retme',
    katman: 'DESTEK',
    beceri_listesi: ['kutupahne_arastirma', 'alternatif_cozum', 'poc_uretme', 'teknoloji_kiyaslama', 'benchmark_arastirma'],
    kapsam_siniri: ['karar_verme', 'deployment', 'guvenlik_denetimi'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['dosya_sistemi', 'bridgeService'],
    durum: 'pasif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'D-25', kod_adi: 'SORGULAYICI',
    rol: 'Sorgulama motoru â€” veri sorgulama, filtreleme, arama indeksi, full-text search',
    katman: 'DESTEK',
    beceri_listesi: ['veri_sorgulama', 'filtreleme', 'arama_indeksi', 'full_text_search', 'postgresql_fts', 'sorgu_optimizasyon'],
    kapsam_siniri: ['frontend_tasarim', 'karar_verme'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['supabase'],
    durum: 'pasif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'D-26', kod_adi: 'UYUMCU',
    rol: 'Mevzuat uyumu â€” KVKK, GDPR, eriÅŸilebilirlik standartlarÄ±, yasal gereksinimler',
    katman: 'DESTEK',
    beceri_listesi: ['kvkk', 'gdpr', 'yasal_gereksinimler', 'erisim_standartlari', 'veri_minimizasyon', 'onay_yonetimi'],
    kapsam_siniri: ['kod_yazma', 'deployment', 'is_plani'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['auditService'],
    durum: 'pasif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'D-27', kod_adi: 'Ã–LÃ‡ER',
    rol: 'Ã–lÃ§Ã¼m ve izleme â€” sistem metrikleri, uptime, SLA takibi, kapasite planÄ±',
    katman: 'DESTEK',
    beceri_listesi: ['sistem_metrikleri', 'uptime_takip', 'sla_izleme', 'kapasite_plani', 'olcek_analizi'],
    kapsam_siniri: ['kod_yazma', 'frontend_tasarim', 'karar_verme'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['auditService', 'alarmService'],
    durum: 'pasif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'D-28', kod_adi: 'Ã–ÄRETMEN',
    rol: 'Bilgi transferi â€” eÄŸitim materyali, onboarding, best practice aktarÄ±mÄ±',
    katman: 'DESTEK',
    beceri_listesi: ['egitim_materyali', 'onboarding', 'best_practice', 'bilgi_transferi', 'tutorial_uretme', 'pratik_rehber'],
    kapsam_siniri: ['kod_yazma', 'deployment', 'veritabani_islemleri'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['dosya_sistemi'],
    durum: 'pasif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
];

// â”€â”€â”€ REGISTRY SINGLETON â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class AgentRegistryManager {
  private agents: Map<string, AgentCard> = new Map();
  private initialized: boolean = false;

  constructor() {
    this.initialize();
    // K-2 Duzeltme: Startup'ta DB'den sayaclari geri yukle
    this.loadCountersFromDB().catch(() => {});
  }

  /**
   * K-2 Duzeltme: Uygulama restart'ta audit_logs'tan sayaclari geri yukler.
   * action_code='AGENT_COUNTER_UPDATE' kayitlarindan en son degerleri alir.
   */
  async loadCountersFromDB(): Promise<void> {
    if (!validateSupabaseConnection().isValid) return;
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('details, timestamp')
        .eq('action_code', 'AGENT_COUNTER_UPDATE')
        .order('timestamp', { ascending: false })
        .limit(200);
      if (error || !data) return;
      const seen = new Set<string>();
      for (const row of data) {
        const d = ((row.details ?? {}) as Record<string, unknown>);
        const agentId = String(d.agent_id ?? '');
        if (!agentId || seen.has(agentId)) continue;
        const agent = this.agents.get(agentId);
        if (!agent) continue;
        if (typeof d.tamamlanan_gorev === 'number') agent.tamamlanan_gorev = d.tamamlanan_gorev;
        if (typeof d.hata_sayisi === 'number') agent.hata_sayisi = d.hata_sayisi;
        if (typeof d.son_aktif === 'string') agent.son_aktif = d.son_aktif;
        seen.add(agentId);
      }
    } catch { /* sessizce gec */ }
  }

  private initialize(): void {
    if (this.initialized) return;
    for (const agent of DEFAULT_ROSTER) {
      this.agents.set(agent.id, { ...agent });
    }
    this.initialized = true;
  }

  getAll(): AgentCard[] {
    return Array.from(this.agents.values());
  }

  getById(id: string): AgentCard | undefined {
    return this.agents.get(id);
  }

  getByKodAdi(kodAdi: string): AgentCard | undefined {
    return this.getAll().find(a => a.kod_adi === kodAdi);
  }

  getByKatman(katman: AgentTier): AgentCard[] {
    return this.getAll().filter(a => a.katman === katman);
  }

  getByDurum(durum: AgentStatus): AgentCard[] {
    return this.getAll().filter(a => a.durum === durum);
  }

  getByBeceri(beceri: string): AgentCard[] {
    return this.getAll().filter(a =>
      a.beceri_listesi.some(b => b.includes(beceri.toLowerCase()))
    );
  }

  findCapableAgents(gorevTipi: string): AgentCard[] {
    return this.getAll().filter(a =>
      a.durum === 'aktif' &&
      a.beceri_listesi.some(b => b.includes(gorevTipi.toLowerCase())) &&
      !a.kapsam_siniri.some(s => s.includes(gorevTipi.toLowerCase()))
    );
  }

  register(agent: AgentCard): { success: boolean; error?: string } {
    if (this.agents.has(agent.id)) {
      processError(ERR.AGENT_REGISTER, new Error(`Ajan ID zaten mevcut: ${agent.id}`), {
        kaynak: 'agentRegistry.ts', islem: 'REGISTER', id: agent.id,
      });
      return { success: false, error: `Ajan ID zaten mevcut: ${agent.id}` };
    }
    this.agents.set(agent.id, { ...agent });
    logAudit({
      operation_type: 'EXECUTE',
      action_description: `Yeni ajan kayÄ±t: ${agent.id} (${agent.kod_adi})`,
      metadata: { action_code: 'AGENT_REGISTER', agent_id: agent.id, kod_adi: agent.kod_adi },
    }).catch(() => {});
    return { success: true };
  }

  updateDurum(id: string, durum: AgentStatus): boolean {
    const agent = this.agents.get(id);
    if (!agent) {
      processError(ERR.AGENT_NOT_FOUND, new Error(`Ajan bulunamadÄ±: ${id}`), {
        kaynak: 'agentRegistry.ts', islem: 'UPDATE_DURUM',
      });
      return false;
    }
    agent.durum = durum;
    agent.son_aktif = new Date().toISOString();
    return true;
  }

  /** GÃ¶rev tamamlandÄ±ÄŸÄ±nda sayaÃ§ gÃ¼ncelle + Supabase'e audit yaz */
  recordGorevTamamlama(id: string, basarili: boolean): boolean {
    const agent = this.agents.get(id);
    if (!agent) return false;
    if (basarili) { agent.tamamlanan_gorev++; } else { agent.hata_sayisi++; }
    agent.son_aktif = new Date().toISOString();
    logAudit({
      operation_type: 'EXECUTE',
      action_description: `Ajan sayaÃ§ gÃ¼ncelleme: ${id} (${agent.kod_adi}) â€” ${basarili ? 'baÅŸarÄ±lÄ±' : 'hata'}`,
      metadata: {
        action_code: 'AGENT_COUNTER_UPDATE',
        agent_id: id, kod_adi: agent.kod_adi,
        tamamlanan_gorev: agent.tamamlanan_gorev,
        hata_sayisi: agent.hata_sayisi,
        basarili,
      },
    }).catch(() => {});
    return true;
  }

  addBeceri(id: string, yeniBeceriler: string[]): boolean {
    const agent = this.agents.get(id);
    if (!agent) return false;
    if (!agent.ogrenme_kapasitesi) {
      processError(ERR.AGENT_UPDATE, new Error(`Ajan Ã¶ÄŸrenme kapasitesi yok: ${id}`), {
        kaynak: 'agentRegistry.ts', islem: 'ADD_BECERI',
      });
      return false;
    }
    for (const beceri of yeniBeceriler) {
      if (!agent.beceri_listesi.includes(beceri)) {
        agent.beceri_listesi.push(beceri);
      }
    }
    return true;
  }

  remove(id: string): boolean {
    if (!this.agents.has(id)) return false;
    this.agents.delete(id);
    return true;
  }

  getStats(): {
    toplam: number; komuta: number; ajan: number; aktif: number; pasif: number;
    toplamGorev: number; toplamHata: number; katmanDagilimi: Record<AgentTier, number>;
  } {
    const all = this.getAll();
    return {
      toplam:      all.length,
      komuta:      all.filter(a => a.katman === 'KOMUTA').length,
      ajan:        all.filter(a => a.katman !== 'KOMUTA').length,
      aktif:       all.filter(a => a.durum === 'aktif').length,
      pasif:       all.filter(a => a.durum !== 'aktif').length,
      toplamGorev: all.reduce((sum, a) => sum + a.tamamlanan_gorev, 0),
      toplamHata:  all.reduce((sum, a) => sum + a.hata_sayisi, 0),
      katmanDagilimi: {
        KOMUTA: all.filter(a => a.katman === 'KOMUTA').length,
        L1:     all.filter(a => a.katman === 'L1').length,
        L2:     all.filter(a => a.katman === 'L2').length,
        L3:     all.filter(a => a.katman === 'L3').length,
        DESTEK: all.filter(a => a.katman === 'DESTEK').length,
      },
    };
  }

  getNextAgentId(): string {
    const existing = this.getAll()
      .filter(a => a.id.startsWith('A-'))
      .map(a => parseInt(a.id.replace('A-', ''), 10))
      .filter(n => !isNaN(n));
    const maxId = existing.length > 0 ? Math.max(...existing) : 0;
    return `A-${String(maxId + 1).padStart(2, '0')}`;
  }
}

// â”€â”€â”€ SINGLETON EXPORT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const agentRegistry = new AgentRegistryManager();

