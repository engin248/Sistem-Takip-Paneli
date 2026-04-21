// ============================================================
// AGENT REGISTRY — 50 KİÃ…ÂİLİK HİBRİT KADRO
// ============================================================
// 4 Komuta + 10 L1 İcraatçı + 6 L2 Denetçi + 2 L3 Hakem
// + 28 Destek Uzmanı = 50 Ajan
//
// Katman hiyerarşisi:
//   KOMUTA — â€™ Strateji, karar, güvenlik, koordinasyon
//   L1     — â€™ Doğrudan icraat (kod, DB, bot, AI, test, güvenlik...)
//   L2     — â€™ Denetim, doğrulama, kalite kontrolü
//   L3     — â€™ Hakem, çelişki çözümü, nihai karar
//   DESTEK — â€™ Altyapı, otomasyon, hafıza, iletişim, analitik
//
// Hata Kodları:
//   ERR-Sistem Takip Paneli001-045 — â€™ Ajan bulunamadı
//   ERR-Sistem Takip Paneli001-046 — â€™ Ajan kaydı başarısız
//   ERR-Sistem Takip Paneli001-047 — â€™ Ajan güncelleme hatası
// ============================================================

import { ERR, processError } from '@/lib/errorCore';
import { logAudit } from './auditService';
import { supabase, validateSupabaseConnection } from '@/lib/supabase';

// —â‚¬—â‚¬—â‚¬ TİP TANIMLARI —â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬

export type AgentTier = 'KOMUTA' | 'L1' | 'L2' | 'L3' | 'DESTEK';
export type AgentStatus = 'aktif' | 'pasif' | 'bakimda' | 'egitimde' | 'devre_disi';

export interface AgentCard {
  /** Benzersiz ajan kimliği */
  id: string;
  /** Ajan kod adı */
  kod_adi: string;
  /** Rol açıklaması */
  rol: string;
  /** Ait olduğu katman */
  katman: AgentTier;
  /** Yapabildiği görev tipleri */
  beceri_listesi: string[];
  /** Yapamayacağı görev tipleri */
  kapsam_siniri: string[];
  /** Yeni kural/bilgi enjekte edilebilir mi? */
  ogrenme_kapasitesi: boolean;
  /** Bağlı olduğu servisler */
  bagimliliklari: string[];
  /** Mevcut durum */
  durum: AgentStatus;
  /** Toplam tamamlanan görev sayısı */
  tamamlanan_gorev: number;
  /** Toplam hata sayısı */
  hata_sayisi: number;
  /** Son aktif olma zamanı */
  son_aktif: string;
  /** Oluşturulma zamanı */
  olusturulma: string;
  /** Klon kaynağı (klonlanmışsa) */
  klon_kaynagi?: string;
  /** Ek metadata */
  metadata?: Record<string, unknown>;
}

// —â‚¬—â‚¬—â‚¬ 50 KİÃ…ÂİLİK KADRO —â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬

const DEFAULT_ROSTER: AgentCard[] = [

  // ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ 
  // KOMUTA KADROSU (4) —  Strateji, Karar, İstihbarat, Güvenlik
  // ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ 

  {
    id: 'K-1', kod_adi: 'KOMUTAN',
    rol: 'Tuğgeneral —  Son karar otoritesi, KABUL/RED yetkisi, operasyon komutanı',
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
    rol: 'Strateji ve iş planı üretici, önceliklendirme motoru, kaynak dağılımı',
    katman: 'KOMUTA',
    beceri_listesi: ['is_plani_uretme', 'onceliklendirme', 'risk_analizi', 'kaynak_planlama', 'zaman_cizelgesi', 'strateji', 'senaryo_analizi'],
    kapsam_siniri: ['kod_yazma', 'dosya_duzenleme'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['aiManager', 'auditService'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'K-3', kod_adi: 'İSTİHBARAT',
    rol: 'Veri toplama, AR-GE, trend analizi, dış kaynak izleme, tehdit istihbaratı',
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
    rol: 'Güvenlik, izolasyon, yetki kontrolü, veri koruma, saldırı önleme',
    katman: 'KOMUTA',
    beceri_listesi: ['guvenlik_denetimi', 'yetki_kontrolu', 'izolasyon', 'veri_koruma', 'rls_yonetimi', 'saldiri_tespiti', 'zero_trust'],
    kapsam_siniri: ['is_plani', 'strateji', 'frontend_gelistirme'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['authService', 'auditService', 'alarmService'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },

  // ══════════════════════════════════════════════════════════
  // L1 İCRAATÇI AJANLAR (10) — Doğrudan Uygulama Katmanı
  // ══════════════════════════════════════════════════════════

  {
    id: 'A-01', kod_adi: 'İCRACI-FE',
    rol: 'Frontend geliştirme — React, Next.js, UI/UX, responsive tasarım',
    katman: 'L1',
    beceri_listesi: ['react', 'nextjs', 'typescript', 'css', 'ui_ux', 'component_gelistirme', 'responsive_tasarim', 'animasyon'],
    kapsam_siniri: ['veritabani_islemleri', 'guvenlik_denetimi'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['dosya_sistemi'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'A-02', kod_adi: 'İCRACI-BE',
    rol: 'Backend geliştirme — API, servisler, iş mantığı, Next.js route handler',
    katman: 'L1',
    beceri_listesi: ['api_gelistirme', 'typescript', 'nextjs_api_routes', 'is_mantigi', 'servis_yazma', 'entegrasyon', 'rest_api'],
    kapsam_siniri: ['frontend_tasarim', 'guvenlik_denetimi'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['dosya_sistemi', 'supabase'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'A-03', kod_adi: 'İCRACI-DB',
    rol: 'Veritabanı işlemleri — Supabase, PostgreSQL, migration, RLS policy tasarımı',
    katman: 'L1',
    beceri_listesi: ['supabase', 'postgresql', 'sql', 'migration', 'rls_policy', 'schema_tasarimi', 'veri_modelleme', 'indeks_optimizasyonu'],
    kapsam_siniri: ['frontend_tasarim', 'ui_ux'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['supabase'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'A-04', kod_adi: 'İCRACI-BOT',
    rol: 'Telegram bot geliştirme — grammy, webhook, komut işleme, bildirim',
    katman: 'L1',
    beceri_listesi: ['telegram_api', 'bot_gelistirme', 'grammy', 'webhook', 'komut_isleme', 'bildirim_gonderme', 'inline_keyboard'],
    kapsam_siniri: ['frontend_tasarim', 'veritabani_islemleri'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['telegramService', 'telegramNotifier'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'A-05', kod_adi: 'İCRACI-TEST',
    rol: 'Test yazma ve kalite güvencesi — unit, integration, e2e, Vitest, Playwright',
    katman: 'L1',
    beceri_listesi: ['vitest', 'playwright', 'unit_test', 'integration_test', 'e2e_test', 'test_yazma', 'coverage', 'mock_stub'],
    kapsam_siniri: ['karar_verme', 'dosya_silme', 'deployment'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['dosya_sistemi'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'A-06', kod_adi: 'İCRACI-SEC',
    rol: 'Güvenlik geliştirme — penetrasyon testi, kriptografi, OWASP, token yönetimi',
    katman: 'L1',
    beceri_listesi: ['penetrasyon_testi', 'kriptografi', 'owasp', 'token_yonetimi', 'jwt', 'sifreleme', 'hash', 'xss_sqli_onleme'],
    kapsam_siniri: ['ui_ux', 'is_plani'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['authService', 'auditService'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'A-07', kod_adi: 'İCRACI-AI',
    rol: 'AI/ML işlemleri — Ollama, model yönetimi, prompt engineering, analiz',
    katman: 'L1',
    beceri_listesi: ['ollama', 'llm', 'prompt_engineering', 'ai_entegrasyon', 'model_yonetimi', 'nlp', 'embedding', 'rag'],
    kapsam_siniri: ['veritabani_degistirme', 'deployment', 'guvenlik_denetimi'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['aiManager', 'selfLearningEngine'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'A-08', kod_adi: 'İCRACI-DATA',
    rol: 'Veri analizi ve ETL — veri dönüşümü, aggregation, raporlama, pipeline',
    katman: 'L1',
    beceri_listesi: ['veri_analizi', 'etl', 'aggregation', 'veri_donusumu', 'raporlama', 'grafik', 'istatistik', 'csv_json_parse'],
    kapsam_siniri: ['frontend_tasarim', 'karar_verme'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['supabase', 'bridgeService'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'A-09', kod_adi: 'İCRACI-INFRA',
    rol: 'Altyapı ve DevOps —  Docker, Vercel, ortam yönetimi, environment konfigürasyonu',
    katman: 'L1',
    beceri_listesi: ['docker', 'vercel', 'ortam_yonetimi', 'environment', 'ci_cd', 'monitoring', 'log_yonetimi', 'uptime'],
    kapsam_siniri: ['frontend_tasarim', 'ui_ux'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['dosya_sistemi', 'auditService'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'A-10', kod_adi: 'İCRACI-AKIŞ',
    rol: 'İş akışı ve otomasyon —  pipeline orchestration, event-driven, cron işler',
    katman: 'L1',
    beceri_listesi: ['workflow_orchestration', 'event_driven', 'cron', 'pipeline_tasarimi', 'otomasyon', 'tetikleyici', 'webhook_yonetimi'],
    kapsam_siniri: ['frontend_tasarim', 'guvenlik_denetimi'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['auditService', 'alarmService'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },

  // ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ 
  // L2 DENETÇİ AJANLAR (6) —  Kalite ve Doğrulama Katmanı
  // ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ 

  {
    id: 'B-01', kod_adi: 'DENETÇİ-KOD',
    rol: 'Kod denetimi —  standartlara uyum, lint, tip güvenliği, mimari doğrulama',
    katman: 'L2',
    beceri_listesi: ['kod_inceleme', 'standart_kontrolu', 'lint', 'tip_guvenligi', 'mimari_dogrulama', 'clean_code', 'solid_prensip'],
    kapsam_siniri: ['kod_yazma', 'dosya_olusturma', 'karar_verme'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['auditService'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'B-02', kod_adi: 'DENETÇİ-DOĞRULA',
    rol: '5 eksen doğrulama —  teknik, güvenlik, performans, operasyonel, UX',
    katman: 'L2',
    beceri_listesi: ['teknik_dogrulama', 'guvenlik_dogrulama', 'performans_dogrulama', 'operasyonel_dogrulama', 'ux_dogrulama', 'bes_eksen_analiz'],
    kapsam_siniri: ['kod_yazma', 'dosya_olusturma'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['auditService', 'consensusEngine'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'B-03', kod_adi: 'DENETÇİ-GÜVENLİK',
    rol: 'Güvenlik denetimi —  zaafiyet tarama, RLS kontrolü, saldırı senaryoları',
    katman: 'L2',
    beceri_listesi: ['zaafiyet_tarama', 'rls_kontrol', 'red_team_simulasyon', 'owasp_denetim', 'ssl_kontrol', 'dependency_audit'],
    kapsam_siniri: ['kod_yazma', 'deployment', 'karar_verme'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['auditService', 'alarmService'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'B-04', kod_adi: 'DENETÇİ-PERFORMANS',
    rol: 'Performans denetimi —  Core Web Vitals, latency analizi, bellek sızıntısı tespiti',
    katman: 'L2',
    beceri_listesi: ['core_web_vitals', 'latency_analizi', 'bellek_analizi', 'profiling', 'benchmark', 'cache_kontrol', 'db_sorgu_analizi'],
    kapsam_siniri: ['kod_yazma', 'ui_tasarim', 'is_plani'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['auditService'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'B-05', kod_adi: 'DENETÇİ-VERİ',
    rol: 'Veri bütünlüğü denetimi — schema uyumu, veri kalitesi, tutarlılık kontrolü',
    katman: 'L2',
    beceri_listesi: ['schema_dogrulama', 'veri_kalitesi', 'tutarlılıkontrolu', 'duplicate_tespiti', 'null_analizi', 'format_dogrulama'],
    kapsam_siniri: ['kod_yazma', 'frontend_tasarim', 'karar_verme'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['supabase', 'auditService'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'B-06', kod_adi: 'DENETÇİ-UX',
    rol: 'UX/UI denetimi — erişilebilirlik, kullanılabilirlik, WCAG uyumu, renk analizi',
    katman: 'L2',
    beceri_listesi: ['erisim_analizi', 'kullanılabilirlik', 'wcag_uyumu', 'renk_kontrastı', 'navigasyon_analizi', 'responsive_kontrol'],
    kapsam_siniri: ['kod_yazma', 'veritabani_islemleri', 'karar_verme'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['auditService'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },

  // ══════════════════════════════════════════════════════════
  // L3 HAKEM AJANLAR (2) — Nihai Karar ve Çelişki Çözüm
  // ══════════════════════════════════════════════════════════

  {
    id: 'C-01', kod_adi: 'HAKEM-1',
    rol: 'L1-L2 çelişki çözümü, nihai teknik karar, kanıt değerlendirme',
    katman: 'L3',
    beceri_listesi: ['celiskilik_cozum', 'nihai_karar', 'konsensus', 'uzlasi', 'kanit_degerlendirme', 'bes_eksen_analiz'],
    kapsam_siniri: ['kod_yazma', 'dosya_olusturma', 'is_plani'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['consensusEngine', 'auditService'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'C-02', kod_adi: 'HAKEM-2',
    rol: 'Stratejik hakem — uzun vadeli kararlar, mimari seçimler, önceliklendirme',
    katman: 'L3',
    beceri_listesi: ['stratejik_karar', 'mimari_secim', 'uzun_vade_planlama', 'risk_degerlendirme', 'alternatifleri_analiz'],
    kapsam_siniri: ['kod_yazma', 'dosya_olusturma'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['consensusEngine', 'auditService', 'boardService'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },

  // ══════════════════════════════════════════════════════════
  // DESTEK AJANLARI (28) — Altyapı ve Uzmanlık Hizmetleri
  // ══════════════════════════════════════════════════════════

  {
    id: 'D-01', kod_adi: 'MÜHÜRDAR',
    rol: 'Audit loglama, mühürleme, arşivleme, SHA-256 kanıt üretimi',
    katman: 'DESTEK',
    beceri_listesi: ['audit_loglama', 'muhurleme', 'arsivleme', 'sha256_hash', 'kanit_toplama', 'tutanak_olusturma'],
    kapsam_siniri: ['kod_yazma', 'is_plani', 'karar_verme'],
    ogrenme_kapasitesi: false,
    bagimliliklari: ['auditService', 'boardService'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'D-02', kod_adi: 'OTOMASYON',
    rol: 'CI/CD, deployment, git işlemleri, Vercel deploy, GitHub Actions yönetimi',
    katman: 'DESTEK',
    beceri_listesi: ['ci_cd', 'deployment', 'git_islemleri', 'vercel_deploy', 'github_actions', 'otomasyon'],
    kapsam_siniri: ['frontend_tasarim', 'guvenlik_denetimi'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['dosya_sistemi', 'git'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'D-03', kod_adi: 'ARGE-A0',
    rol: 'Araştırma birincil — trend analizi, beceri haritası, pazar araştırması',
    katman: 'DESTEK',
    beceri_listesi: ['arastirma', 'analiz', 'rapor_uretme', 'veri_siniflandirma', 'trend_analizi', 'beceri_haritasi'],
    kapsam_siniri: ['kod_yazma', 'veritabani_degistirme', 'terminal_komutu'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['bridgeService'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'D-04', kod_adi: 'KÖPRÜ',
    rol: 'Dış sistem entegrasyonu — harici API, SKM köprüsü, veri senkronizasyon',
    katman: 'DESTEK',
    beceri_listesi: ['dis_sistem_baglantisi', 'api_entegrasyon', 'veri_senkronizasyon', 'saglik_kontrolu', 'latency_izleme'],
    kapsam_siniri: ['kod_yazma', 'frontend_tasarim', 'karar_verme'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['bridgeService', 'auditService'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'D-05', kod_adi: 'NÖBETÇİ',
    rol: 'Alarm ve monitoring — 7/24 sistem izleme, anomali tespiti, eşik kontrolü',
    katman: 'DESTEK',
    beceri_listesi: ['alarm_yonetimi', 'monitoring', 'saglik_kontrolu', 'anomali_tespiti', 'bildirim_gonderme', 'esik_izleme'],
    kapsam_siniri: ['kod_yazma', 'is_plani', 'frontend_tasarim'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['alarmService', 'telegramNotifier', 'auditService'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'D-06', kod_adi: 'DOKÜMANTER',
    rol: 'Teknik dokümantasyon — README, API docs, şema diyagramları, değişiklik günlüğü',
    katman: 'DESTEK',
    beceri_listesi: ['readme_yazimi', 'api_dokumantasyonu', 'diyagram_olusturma', 'changelog', 'wiki_yonetimi', 'teknik_yazarlik'],
    kapsam_siniri: ['kod_yazma', 'veritabani_islemleri', 'karar_verme'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['dosya_sistemi'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'D-07', kod_adi: 'HAFIZA',
    rol: 'Sistem hafızası — uzun süreli bağlam, önceki kararlar, pattern arşivi',
    katman: 'DESTEK',
    beceri_listesi: ['baglam_yonetimi', 'uzun_donem_hafiza', 'pattern_arsivi', 'karar_gecmisi', 'oturum_yonetimi'],
    kapsam_siniri: ['kod_yazma', 'frontend_tasarim', 'deployment'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['supabase', 'selfLearningEngine'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'D-08', kod_adi: 'HABERCİ',
    rol: 'Bildirim hub — Telegram, email, webhook bildirim orkestrasyonu',
    katman: 'DESTEK',
    beceri_listesi: ['telegram_bildirim', 'email_bildirim', 'webhook_bildirim', 'bildirim_onceliklendirme', 'kanal_secimi'],
    kapsam_siniri: ['kod_yazma', 'veritabani_islemleri', 'karar_verme'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['telegramNotifier', 'auditService'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'D-09', kod_adi: 'ANALİST',
    rol: 'İstatistik ve metrik analizi — KPI takibi, trend grafikleri, karar destek',
    katman: 'DESTEK',
    beceri_listesi: ['kpi_takibi', 'istatistik_analizi', 'trend_grafik', 'karar_destek', 'metrik_hesaplama', 'dashboard_veri'],
    kapsam_siniri: ['kod_yazma', 'frontend_tasarim'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['supabase', 'bridgeService'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'D-10', kod_adi: 'PLANLAYICI',
    rol: 'Proje planlama — sprint, milestone, görev ağacı, bağımlılık haritası',
    katman: 'DESTEK',
    beceri_listesi: ['sprint_planlama', 'milestone_yonetimi', 'gorev_agaci', 'bagimlilik_haritasi', 'gantt', 'kaynak_tahsisi'],
    kapsam_siniri: ['kod_yazma', 'veritabani_islemleri'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['supabase', 'auditService'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'D-11', kod_adi: 'ÇEVİRMEN',
    rol: 'Ö¡ok dilli destek — i18n, TR/EN/AR çeviri, RTL uyumu, yerelleştirme',
    katman: 'DESTEK',
    beceri_listesi: ['i18n', 'ceviri', 'yerellestime', 'rtl_destek', 'kulturel_uyum', 'dil_kontrolu'],
    kapsam_siniri: ['kod_yazma', 'veritabani_islemleri', 'karar_verme'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['dosya_sistemi'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'D-12', kod_adi: 'YEDEKÇİ',
    rol: 'Yedek ve kurtarma — otomatik yedek, felaket kurtarma, rollback, snapshot',
    katman: 'DESTEK',
    beceri_listesi: ['otomatik_yedek', 'felakat_kurtarma', 'rollback', 'snapshot', 'veri_kurtarma', 'replikasyon'],
    kapsam_siniri: ['frontend_tasarim', 'ui_ux', 'karar_verme'],
    ogrenme_kapasitesi: false,
    bagimliliklari: ['supabase', 'dosya_sistemi'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'D-13', kod_adi: 'ÖNBELLEK',
    rol: 'Cache yönetimi — Redis, in-memory cache, TTL stratejisi, invalidasyon',
    katman: 'DESTEK',
    beceri_listesi: ['cache_yonetimi', 'ttl_stratejisi', 'invalidasyon', 'redis', 'in_memory_cache', 'cdn_yonetimi'],
    kapsam_siniri: ['frontend_tasarim', 'is_plani', 'karar_verme'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['supabase'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'D-14', kod_adi: 'OPTİMİZÖR',
    rol: 'Sistem optimizasyonu — algoritma iyileştirme, DB sorgu, bundle küçültme',
    katman: 'DESTEK',
    beceri_listesi: ['algoritma_iyilestirme', 'db_sorgu_optimizasyon', 'bundle_kucultme', 'lazy_loading', 'kod_profiling'],
    kapsam_siniri: ['is_plani', 'karar_verme', 'guvenlik_denetimi'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['auditService'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'D-15', kod_adi: 'DEDEKTİF',
    rol: 'Hata ayıklama ve kök neden analizi — stack trace, log analizi, reproduksiyon',
    katman: 'DESTEK',
    beceri_listesi: ['hata_ayiklama', 'kok_neden_analizi', 'stack_trace', 'log_analizi', 'reproduksiyon', 'bug_report'],
    kapsam_siniri: ['frontend_tasarim', 'deployment', 'is_plani'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['auditService', 'selfLearningEngine'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'D-16', kod_adi: 'KOORDİNATÖR',
    rol: 'Ajan koordinasyonu — görev dağılımı, iş kuyruğu, kapasite yönetimi',
    katman: 'DESTEK',
    beceri_listesi: ['gorev_dagitimi', 'is_kuyrugu', 'kapasite_yonetimi', 'ajan_koordinasyon', 'paralel_yurutme'],
    kapsam_siniri: ['kod_yazma', 'frontend_tasarim'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['auditService'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'D-17', kod_adi: 'SİNYAL',
    rol: 'Event sistemi — pub/sub, event bus, gerçek zamanlı bildirim, SSE/WebSocket',
    katman: 'DESTEK',
    beceri_listesi: ['pub_sub', 'event_bus', 'gercek_zamanli', 'sse', 'websocket', 'event_sourcing'],
    kapsam_siniri: ['karar_verme', 'veritabani_degistirme', 'guvenlik_denetimi'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['telegramNotifier', 'auditService'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'D-18', kod_adi: 'KURAL-MOT',
    rol: 'Kural motoru — iş kuralları, politika uygulama, uyum denetimi',
    katman: 'DESTEK',
    beceri_listesi: ['is_kurallari', 'politika_uygulama', 'uyum_denetimi', 'karar_agaci', 'kural_motoru'],
    kapsam_siniri: ['frontend_tasarim', 'veritabani_islemleri'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['auditService', 'consensusEngine'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'D-19', kod_adi: 'RAPORCU',
    rol: 'Raporlama motoru — otomatik rapor, PDF/CSV/JSON export, periyodik özet',
    katman: 'DESTEK',
    beceri_listesi: ['rapor_uretme', 'pdf_export', 'csv_export', 'json_export', 'periyodik_ozet', 'tablo_olusturma'],
    kapsam_siniri: ['kod_yazma', 'karar_verme', 'deployment'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['supabase', 'auditService'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'D-20', kod_adi: 'FORMATÖR',
    rol: 'Standart ve format — kod stili, naming convention, şema standardizasyon',
    katman: 'DESTEK',
    beceri_listesi: ['kod_stili', 'naming_convention', 'sema_standardizasyon', 'prettier', 'eslint_konfig', 'format_belirleme'],
    kapsam_siniri: ['karar_verme', 'deployment', 'guvenlik_denetimi'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['dosya_sistemi'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'D-21', kod_adi: 'TETİKÇİ',
    rol: 'Zamanlayıcı ve tetikleyici — cron jobs, zamanlı görev, bekleme yönetimi',
    katman: 'DESTEK',
    beceri_listesi: ['cron_jobs', 'zamanli_gorev', 'bekleme_yonetimi', 'gecikme_kontrol', 'tekrar_deneme', 'timeout'],
    kapsam_siniri: ['frontend_tasarim', 'karar_verme', 'is_plani'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['auditService'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'D-22', kod_adi: 'ARABULUCU',
    rol: 'Ö¡atışma çözümü — versiyon çakışması, merge conflict, anlaşmazlık yönetimi',
    katman: 'DESTEK',
    beceri_listesi: ['catisma_cozumu', 'merge_conflict', 'anlasmazlik_yonetimi', 'uzlasma', 'versiyonlama'],
    kapsam_siniri: ['kod_yazma', 'deployment', 'veritabani_islemleri'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['auditService'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'D-23', kod_adi: 'MÜHENDİS',
    rol: 'Sistem mühendisliği — mimari tasarım, teknik borç yönetimi, refactoring',
    katman: 'DESTEK',
    beceri_listesi: ['mimari_tasarim', 'teknik_borc_yonetimi', 'refactoring', 'sistem_tasarimi', 'pattern_secimi', 'moduler_yapi'],
    kapsam_siniri: ['frontend_tasarim', 'is_plani'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['dosya_sistemi', 'auditService'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'D-24', kod_adi: 'KEÃ…ÂFEDEN',
    rol: 'Yeni teknoloji keşfi — kütüphane araştırma, alternatif çözüm, POC üretme',
    katman: 'DESTEK',
    beceri_listesi: ['kutupahne_arastirma', 'alternatif_cozum', 'poc_uretme', 'teknoloji_kiyaslama', 'benchmark_arastirma'],
    kapsam_siniri: ['karar_verme', 'deployment', 'guvenlik_denetimi'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['dosya_sistemi', 'bridgeService'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'D-25', kod_adi: 'SORGULAYICI',
    rol: 'Sorgulama motoru — veri sorgulama, filtreleme, arama indeksi, full-text search',
    katman: 'DESTEK',
    beceri_listesi: ['veri_sorgulama', 'filtreleme', 'arama_indeksi', 'full_text_search', 'postgresql_fts', 'sorgu_optimizasyon'],
    kapsam_siniri: ['frontend_tasarim', 'karar_verme'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['supabase'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'D-26', kod_adi: 'UYUMCU',
    rol: 'Mevzuat uyumu — KVKK, GDPR, erişilebilirlik standartları, yasal gereksinimler',
    katman: 'DESTEK',
    beceri_listesi: ['kvkk', 'gdpr', 'yasal_gereksinimler', 'erisim_standartlari', 'veri_minimizasyon', 'onay_yonetimi'],
    kapsam_siniri: ['kod_yazma', 'deployment', 'is_plani'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['auditService'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'D-27', kod_adi: 'ÖLÇER',
    rol: 'Ö“lçüm ve izleme — sistem metrikleri, uptime, SLA takibi, kapasite planı',
    katman: 'DESTEK',
    beceri_listesi: ['sistem_metrikleri', 'uptime_takip', 'sla_izleme', 'kapasite_plani', 'olcek_analizi'],
    kapsam_siniri: ['kod_yazma', 'frontend_tasarim', 'karar_verme'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['auditService', 'alarmService'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'D-28', kod_adi: 'Ö“ĞRETMEN',
    rol: 'Bilgi transferi — eğitim materyali, onboarding, best practice aktarımı',
    katman: 'DESTEK',
    beceri_listesi: ['egitim_materyali', 'onboarding', 'best_practice', 'bilgi_transferi', 'tutorial_uretme', 'pratik_rehber'],
    kapsam_siniri: ['kod_yazma', 'deployment', 'veritabani_islemleri'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['dosya_sistemi'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },

  // ===========================================================================
  // SİSTEM TAKİP PANELİ / Sistem Takip Paneli ÖZEL EKİBİ (8) — 4 İŞlem & Denetim Grubu
  // ===========================================================================
  {
    id: 'ANTI-01', kod_adi: 'ANTI-A1',
    rol: 'Antigravity Üyesi A1 — Aritmetik işlem icracısı',
    katman: 'L1',
    beceri_listesi: ['aritmetik_islem', 'toplama', 'cikarma', 'carpma', 'bolme'],
    kapsam_siniri: ['karar_verme', 'veritabani_islemleri'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['dosya_sistemi'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'ANTI-02', kod_adi: 'ANTI-A2',
    rol: 'Antigravity Üyesi A2 — Aritmetik işlem icracısı',
    katman: 'L1',
    beceri_listesi: ['aritmetik_islem', 'toplama', 'cikarma', 'carpma', 'bolme'],
    kapsam_siniri: ['karar_verme', 'veritabani_islemleri'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['dosya_sistemi'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'IVDE-01', kod_adi: 'IVDE-C1',
    rol: 'IVDE Codex Üyesi C1 — Aritmetik işlem icracısı',
    katman: 'L1',
    beceri_listesi: ['aritmetik_islem', 'toplama', 'cikarma', 'carpma', 'bolme'],
    kapsam_siniri: ['karar_verme', 'veritabani_islemleri'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['dosya_sistemi'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'IVDE-02', kod_adi: 'IVDE-C2',
    rol: 'IVDE Codex Üyesi C2 — Aritmetik işlem icracısı',
    katman: 'L1',
    beceri_listesi: ['aritmetik_islem', 'toplama', 'cikarma', 'carpma', 'bolme'],
    kapsam_siniri: ['karar_verme', 'veritabani_islemleri'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['dosya_sistemi'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'CNTRL-01', kod_adi: 'KONTROL-1',
    rol: 'Sistem Denetçisi 1 — Sadece kontrol, müdahale yasak',
    katman: 'L2',
    beceri_listesi: ['dogrulama', 'islem_kontrolu', 'aritmetik_denetim'],
    kapsam_siniri: ['islem_yapma', 'mudahale_etme'],
    ogrenme_kapasitesi: false,
    bagimliliklari: ['auditService'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'CNTRL-02', kod_adi: 'KONTROL-2',
    rol: 'Sistem Denetçisi 2 — Sadece kontrol, müdahale yasak',
    katman: 'L2',
    beceri_listesi: ['dogrulama', 'islem_kontrolu', 'aritmetik_denetim'],
    kapsam_siniri: ['islem_yapma', 'mudahale_etme'],
    ogrenme_kapasitesi: false,
    bagimliliklari: ['auditService'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'CNTRL-03', kod_adi: 'KONTROL-3',
    rol: 'Sistem Denetçisi 3 — Sadece kontrol, müdahale yasak',
    katman: 'L2',
    beceri_listesi: ['dogrulama', 'islem_kontrolu', 'aritmetik_denetim'],
    kapsam_siniri: ['islem_yapma', 'mudahale_etme'],
    ogrenme_kapasitesi: false,
    bagimliliklari: ['auditService'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'CNTRL-04', kod_adi: 'KONTROL-4',
    rol: 'Sistem Denetçisi 4 — Sadece kontrol, müdahale yasak',
    katman: 'L2',
    beceri_listesi: ['dogrulama', 'islem_kontrolu', 'aritmetik_denetim'],
    kapsam_siniri: ['islem_yapma', 'mudahale_etme'],
    ogrenme_kapasitesi: false,
    bagimliliklari: ['auditService'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
];

// —â‚¬—â‚¬—â‚¬ REGISTRY SINGLETON —â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬

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
    const now = new Date().toISOString();
    for (const agent of DEFAULT_ROSTER) {
      this.agents.set(agent.id, { ...agent, son_aktif: now, olusturulma: now });
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
      action_description: `Yeni ajan kayıt: ${agent.id} (${agent.kod_adi})`,
      metadata: { action_code: 'AGENT_REGISTER', agent_id: agent.id, kod_adi: agent.kod_adi },
    }).catch(() => {});
    return { success: true };
  }

  updateDurum(id: string, durum: AgentStatus): boolean {
    const agent = this.agents.get(id);
    if (!agent) {
      processError(ERR.AGENT_NOT_FOUND, new Error(`Ajan bulunamadı: ${id}`), {
        kaynak: 'agentRegistry.ts', islem: 'UPDATE_DURUM',
      });
      return false;
    }
    agent.durum = durum;
    agent.son_aktif = new Date().toISOString();
    return true;
  }

  /** Görev tamamlandığında sayaç güncelle + Supabase'e audit yaz */
  recordGorevTamamlama(id: string, basarili: boolean): boolean {
    const agent = this.agents.get(id);
    if (!agent) return false;
    if (basarili) { agent.tamamlanan_gorev++; } else { agent.hata_sayisi++; }
    agent.son_aktif = new Date().toISOString();
    logAudit({
      operation_type: 'EXECUTE',
      action_description: `Ajan sayaç güncelleme: ${id} (${agent.kod_adi}) — ${basarili ? 'başarılı' : 'hata'}`,
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
      processError(ERR.AGENT_UPDATE, new Error(`Ajan öğrenme kapasitesi yok: ${id}`), {
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

  /** Force re-initialize registry from default roster (development helper) */
  reinitialize(): { success: boolean; toplam: number } {
    try {
      this.agents.clear();
      const now = new Date().toISOString();
      for (const agent of DEFAULT_ROSTER) {
        this.agents.set(agent.id, { ...agent, son_aktif: now, olusturulma: now });
      }
      this.initialized = true;
      return { success: true, toplam: this.agents.size };
    } catch (e) {
      processError(ERR.AGENT_REGISTER, e instanceof Error ? e : new Error(String(e)), { kaynak: 'agentRegistry.ts', islem: 'REINIT' });
      return { success: false, toplam: this.agents.size };
    }
  }
}

// —â‚¬—â‚¬—â‚¬ SINGLETON EXPORT —â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬—â‚¬

export const agentRegistry = new AgentRegistryManager();


