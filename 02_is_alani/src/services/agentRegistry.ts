// ============================================================
// AGENT REGISTRY Ã¢â‚¬â€ 50 KÃ„Â°Ã…ÂÃ„Â°LÃ„Â°K HÃ„Â°BRÃ„Â°T KADRO
// ============================================================
// 4 Komuta + 10 L1 Ã„Â°craatÃƒÂ§Ã„Â± + 6 L2 DenetÃƒÂ§i + 2 L3 Hakem
// + 28 Destek UzmanÃ„Â± = 50 Ajan
//
// Katman hiyerarÃ…Å¸isi:
//   KOMUTA Ã¢â€ â€™ Strateji, karar, gÃƒÂ¼venlik, koordinasyon
//   L1     Ã¢â€ â€™ DoÃ„Å¸rudan icraat (kod, DB, bot, AI, test, gÃƒÂ¼venlik...)
//   L2     Ã¢â€ â€™ Denetim, doÃ„Å¸rulama, kalite kontrolÃƒÂ¼
//   L3     Ã¢â€ â€™ Hakem, ÃƒÂ§eliÃ…Å¸ki ÃƒÂ§ÃƒÂ¶zÃƒÂ¼mÃƒÂ¼, nihai karar
//   DESTEK Ã¢â€ â€™ AltyapÃ„Â±, otomasyon, hafÃ„Â±za, iletiÃ…Å¸im, analitik
//
// Hata KodlarÃ„Â±:
//   ERR-STP001-045 Ã¢â€ â€™ Ajan bulunamadÃ„Â±
//   ERR-STP001-046 Ã¢â€ â€™ Ajan kaydÃ„Â± baÃ…Å¸arÃ„Â±sÃ„Â±z
//   ERR-STP001-047 Ã¢â€ â€™ Ajan gÃƒÂ¼ncelleme hatasÃ„Â±
// ============================================================

import { ERR, processError } from '@/lib/errorCore';
import { logAudit } from './auditService';
import { supabase, validateSupabaseConnection } from '@/lib/supabase';

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ TÃ„Â°P TANIMLARI Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

export type AgentTier = 'KOMUTA' | 'L1' | 'L2' | 'L3' | 'DESTEK';
export type AgentStatus = 'aktif' | 'pasif' | 'bakimda' | 'egitimde' | 'devre_disi';

export interface AgentCard {
  /** Benzersiz ajan kimliÃ„Å¸i */
  id: string;
  /** Ajan kod adÃ„Â± */
  kod_adi: string;
  /** Rol aÃƒÂ§Ã„Â±klamasÃ„Â± */
  rol: string;
  /** Ait olduÃ„Å¸u katman */
  katman: AgentTier;
  /** YapabildiÃ„Å¸i gÃƒÂ¶rev tipleri */
  beceri_listesi: string[];
  /** YapamayacaÃ„Å¸Ã„Â± gÃƒÂ¶rev tipleri */
  kapsam_siniri: string[];
  /** Yeni kural/bilgi enjekte edilebilir mi? */
  ogrenme_kapasitesi: boolean;
  /** BaÃ„Å¸lÃ„Â± olduÃ„Å¸u servisler */
  bagimliliklari: string[];
  /** Mevcut durum */
  durum: AgentStatus;
  /** Toplam tamamlanan gÃƒÂ¶rev sayÃ„Â±sÃ„Â± */
  tamamlanan_gorev: number;
  /** Toplam hata sayÃ„Â±sÃ„Â± */
  hata_sayisi: number;
  /** Son aktif olma zamanÃ„Â± */
  son_aktif: string;
  /** OluÃ…Å¸turulma zamanÃ„Â± */
  olusturulma: string;
  /** Klon kaynaÃ„Å¸Ã„Â± (klonlanmÃ„Â±Ã…Å¸sa) */
  klon_kaynagi?: string;
  /** Ek metadata */
  metadata?: Record<string, unknown>;
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ 50 KÃ„Â°Ã…ÂÃ„Â°LÃ„Â°K KADRO Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

const DEFAULT_ROSTER: AgentCard[] = [

  // Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
  // KOMUTA KADROSU (4) Ã¢â‚¬â€ Strateji, Karar, Ã„Â°stihbarat, GÃƒÂ¼venlik
  // Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â

  {
    id: 'K-1', kod_adi: 'KOMUTAN',
    rol: 'TuÃ„Å¸general Ã¢â‚¬â€ Son karar otoritesi, KABUL/RED yetkisi, operasyon komutanÃ„Â±',
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
    rol: 'Strateji ve iÃ…Å¸ planÃ„Â± ÃƒÂ¼retici, ÃƒÂ¶nceliklendirme motoru, kaynak daÃ„Å¸Ã„Â±lÃ„Â±mÃ„Â±',
    katman: 'KOMUTA',
    beceri_listesi: ['is_plani_uretme', 'onceliklendirme', 'risk_analizi', 'kaynak_planlama', 'zaman_cizelgesi', 'strateji', 'senaryo_analizi'],
    kapsam_siniri: ['kod_yazma', 'dosya_duzenleme'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['aiManager', 'auditService'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'K-3', kod_adi: 'Ã„Â°STÃ„Â°HBARAT',
    rol: 'Veri toplama, AR-GE, trend analizi, dÃ„Â±Ã…Å¸ kaynak izleme, tehdit istihbaratÃ„Â±',
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
    rol: 'GÃƒÂ¼venlik, izolasyon, yetki kontrolÃƒÂ¼, veri koruma, saldÃ„Â±rÃ„Â± ÃƒÂ¶nleme',
    katman: 'KOMUTA',
    beceri_listesi: ['guvenlik_denetimi', 'yetki_kontrolu', 'izolasyon', 'veri_koruma', 'rls_yonetimi', 'saldiri_tespiti', 'zero_trust'],
    kapsam_siniri: ['is_plani', 'strateji', 'frontend_gelistirme'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['authService', 'auditService', 'alarmService'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },

  // Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
  // L1 Ã„Â°CRAATÃƒâ€¡I AJANLAR (10) Ã¢â‚¬â€ DoÃ„Å¸rudan Uygulama KatmanÃ„Â±
  // Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â

  {
    id: 'A-01', kod_adi: 'Ã„Â°CRACI-FE',
    rol: 'Frontend geliÃ…Å¸tirme Ã¢â‚¬â€ React, Next.js, UI/UX, responsive tasarÃ„Â±m',
    katman: 'L1',
    beceri_listesi: ['react', 'nextjs', 'typescript', 'css', 'ui_ux', 'component_gelistirme', 'responsive_tasarim', 'animasyon'],
    kapsam_siniri: ['veritabani_islemleri', 'guvenlik_denetimi'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['dosya_sistemi'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'A-02', kod_adi: 'Ã„Â°CRACI-BE',
    rol: 'Backend geliÃ…Å¸tirme Ã¢â‚¬â€ API, servisler, iÃ…Å¸ mantÃ„Â±Ã„Å¸Ã„Â±, Next.js route handler',
    katman: 'L1',
    beceri_listesi: ['api_gelistirme', 'typescript', 'nextjs_api_routes', 'is_mantigi', 'servis_yazma', 'entegrasyon', 'rest_api'],
    kapsam_siniri: ['frontend_tasarim', 'guvenlik_denetimi'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['dosya_sistemi', 'supabase'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'A-03', kod_adi: 'Ã„Â°CRACI-DB',
    rol: 'VeritabanÃ„Â± iÃ…Å¸lemleri Ã¢â‚¬â€ Supabase, PostgreSQL, migration, RLS policy tasarÃ„Â±mÃ„Â±',
    katman: 'L1',
    beceri_listesi: ['supabase', 'postgresql', 'sql', 'migration', 'rls_policy', 'schema_tasarimi', 'veri_modelleme', 'indeks_optimizasyonu'],
    kapsam_siniri: ['frontend_tasarim', 'ui_ux'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['supabase'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'A-04', kod_adi: 'Ã„Â°CRACI-BOT',
    rol: 'Telegram bot geliÃ…Å¸tirme Ã¢â‚¬â€ grammy, webhook, komut iÃ…Å¸leme, bildirim',
    katman: 'L1',
    beceri_listesi: ['telegram_api', 'bot_gelistirme', 'grammy', 'webhook', 'komut_isleme', 'bildirim_gonderme', 'inline_keyboard'],
    kapsam_siniri: ['frontend_tasarim', 'veritabani_islemleri'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['telegramService', 'telegramNotifier'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'A-05', kod_adi: 'Ã„Â°CRACI-TEST',
    rol: 'Test yazma ve kalite gÃƒÂ¼vencesi Ã¢â‚¬â€ unit, integration, e2e, Vitest, Playwright',
    katman: 'L1',
    beceri_listesi: ['vitest', 'playwright', 'unit_test', 'integration_test', 'e2e_test', 'test_yazma', 'coverage', 'mock_stub'],
    kapsam_siniri: ['karar_verme', 'dosya_silme', 'deployment'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['dosya_sistemi'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'A-06', kod_adi: 'Ã„Â°CRACI-SEC',
    rol: 'GÃƒÂ¼venlik geliÃ…Å¸tirme Ã¢â‚¬â€ penetrasyon testi, kriptografi, OWASP, token yÃƒÂ¶netimi',
    katman: 'L1',
    beceri_listesi: ['penetrasyon_testi', 'kriptografi', 'owasp', 'token_yonetimi', 'jwt', 'sifreleme', 'hash', 'xss_sqli_onleme'],
    kapsam_siniri: ['ui_ux', 'is_plani'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['authService', 'auditService'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'A-07', kod_adi: 'Ã„Â°CRACI-AI',
    rol: 'AI/ML iÃ…Å¸lemleri Ã¢â‚¬â€ Ollama, model yÃƒÂ¶netimi, prompt engineering, analiz',
    katman: 'L1',
    beceri_listesi: ['ollama', 'llm', 'prompt_engineering', 'ai_entegrasyon', 'model_yonetimi', 'nlp', 'embedding', 'rag'],
    kapsam_siniri: ['veritabani_degistirme', 'deployment', 'guvenlik_denetimi'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['aiManager', 'selfLearningEngine'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'A-08', kod_adi: 'Ã„Â°CRACI-DATA',
    rol: 'Veri analizi ve ETL Ã¢â‚¬â€ veri dÃƒÂ¶nÃƒÂ¼Ã…Å¸ÃƒÂ¼mÃƒÂ¼, aggregation, raporlama, pipeline',
    katman: 'L1',
    beceri_listesi: ['veri_analizi', 'etl', 'aggregation', 'veri_donusumu', 'raporlama', 'grafik', 'istatistik', 'csv_json_parse'],
    kapsam_siniri: ['frontend_tasarim', 'karar_verme'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['supabase', 'bridgeService'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'A-09', kod_adi: 'Ã„Â°CRACI-INFRA',
    rol: 'AltyapÃ„Â± ve DevOps Ã¢â‚¬â€ Docker, Vercel, ortam yÃƒÂ¶netimi, environment konfigÃƒÂ¼rasyonu',
    katman: 'L1',
    beceri_listesi: ['docker', 'vercel', 'ortam_yonetimi', 'environment', 'ci_cd', 'monitoring', 'log_yonetimi', 'uptime'],
    kapsam_siniri: ['frontend_tasarim', 'ui_ux'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['dosya_sistemi', 'auditService'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'A-10', kod_adi: 'Ã„Â°CRACI-AKIÃ…Â',
    rol: 'Ã„Â°Ã…Å¸ akÃ„Â±Ã…Å¸Ã„Â± ve otomasyon Ã¢â‚¬â€ pipeline orchestration, event-driven, cron iÃ…Å¸ler',
    katman: 'L1',
    beceri_listesi: ['workflow_orchestration', 'event_driven', 'cron', 'pipeline_tasarimi', 'otomasyon', 'tetikleyici', 'webhook_yonetimi'],
    kapsam_siniri: ['frontend_tasarim', 'guvenlik_denetimi'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['auditService', 'alarmService'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },

  // Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
  // L2 DENETÃƒâ€¡Ã„Â° AJANLAR (6) Ã¢â‚¬â€ Kalite ve DoÃ„Å¸rulama KatmanÃ„Â±
  // Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â

  {
    id: 'B-01', kod_adi: 'DENETÃƒâ€¡Ã„Â°-KOD',
    rol: 'Kod denetimi Ã¢â‚¬â€ standartlara uyum, lint, tip gÃƒÂ¼venliÃ„Å¸i, mimari doÃ„Å¸rulama',
    katman: 'L2',
    beceri_listesi: ['kod_inceleme', 'standart_kontrolu', 'lint', 'tip_guvenligi', 'mimari_dogrulama', 'clean_code', 'solid_prensip'],
    kapsam_siniri: ['kod_yazma', 'dosya_olusturma', 'karar_verme'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['auditService'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'B-02', kod_adi: 'DENETÃƒâ€¡Ã„Â°-DOÃ„ÂRULA',
    rol: '5 eksen doÃ„Å¸rulama Ã¢â‚¬â€ teknik, gÃƒÂ¼venlik, performans, operasyonel, UX',
    katman: 'L2',
    beceri_listesi: ['teknik_dogrulama', 'guvenlik_dogrulama', 'performans_dogrulama', 'operasyonel_dogrulama', 'ux_dogrulama', 'bes_eksen_analiz'],
    kapsam_siniri: ['kod_yazma', 'dosya_olusturma'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['auditService', 'consensusEngine'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'B-03', kod_adi: 'DENETÃƒâ€¡Ã„Â°-GÃƒÅ“VENLÃ„Â°K',
    rol: 'GÃƒÂ¼venlik denetimi Ã¢â‚¬â€ zaafiyet tarama, RLS kontrolÃƒÂ¼, saldÃ„Â±rÃ„Â± senaryolarÃ„Â±',
    katman: 'L2',
    beceri_listesi: ['zaafiyet_tarama', 'rls_kontrol', 'red_team_simulasyon', 'owasp_denetim', 'ssl_kontrol', 'dependency_audit'],
    kapsam_siniri: ['kod_yazma', 'deployment', 'karar_verme'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['auditService', 'alarmService'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'B-04', kod_adi: 'DENETÃƒâ€¡Ã„Â°-PERF',
    rol: 'Performans denetimi Ã¢â‚¬â€ Core Web Vitals, latency analizi, bellek sÃ„Â±zÃ„Â±ntÃ„Â±sÃ„Â± tespiti',
    katman: 'L2',
    beceri_listesi: ['core_web_vitals', 'latency_analizi', 'bellek_analizi', 'profiling', 'benchmark', 'cache_kontrol', 'db_sorgu_analizi'],
    kapsam_siniri: ['kod_yazma', 'ui_tasarim', 'is_plani'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['auditService'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'B-05', kod_adi: 'DENETÃƒâ€¡Ã„Â°-VERÃ„Â°',
    rol: 'Veri bÃƒÂ¼tÃƒÂ¼nlÃƒÂ¼Ã„Å¸ÃƒÂ¼ denetimi Ã¢â‚¬â€ schema uyumu, veri kalitesi, tutarlÃ„Â±lÃ„Â±k kontrolÃƒÂ¼',
    katman: 'L2',
    beceri_listesi: ['schema_dogrulama', 'veri_kalitesi', 'tutarlilik_kontrolu', 'duplicate_tespiti', 'null_analizi', 'format_dogrulama'],
    kapsam_siniri: ['kod_yazma', 'frontend_tasarim', 'karar_verme'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['supabase', 'auditService'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'B-06', kod_adi: 'DENETÃƒâ€¡Ã„Â°-UX',
    rol: 'UX/UI denetimi Ã¢â‚¬â€ eriÃ…Å¸ilebilirlik, kullanÃ„Â±labilirlik, WCAG uyumu, renk analizi',
    katman: 'L2',
    beceri_listesi: ['erisim_analizi', 'kullanilabilirlik', 'wcag_uyumu', 'renk_kontrastÃ„Â±', 'navigasyon_analizi', 'responsive_kontrol'],
    kapsam_siniri: ['kod_yazma', 'veritabani_islemleri', 'karar_verme'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['auditService'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },

  // Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
  // L3 HAKEM AJANLAR (2) Ã¢â‚¬â€ Nihai Karar ve Ãƒâ€¡eliÃ…Å¸ki Ãƒâ€¡ÃƒÂ¶zÃƒÂ¼mÃƒÂ¼
  // Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â

  {
    id: 'C-01', kod_adi: 'HAKEM-1',
    rol: 'L1-L2 ÃƒÂ§eliÃ…Å¸ki ÃƒÂ§ÃƒÂ¶zÃƒÂ¼mÃƒÂ¼, nihai teknik karar, kanÃ„Â±t deÃ„Å¸erlendirme',
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
    rol: 'Stratejik hakem Ã¢â‚¬â€ uzun vadeli kararlar, mimari seÃƒÂ§imler, ÃƒÂ¶nceliklendirme',
    katman: 'L3',
    beceri_listesi: ['stratejik_karar', 'mimari_secim', 'uzun_vade_planlama', 'risk_degerlendirme', 'alternatifleri_analiz'],
    kapsam_siniri: ['kod_yazma', 'dosya_olusturma'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['consensusEngine', 'auditService', 'boardService'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },

  // Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
  // DESTEK AJANLARI (28) Ã¢â‚¬â€ AltyapÃ„Â± ve UzmanlÃ„Â±k Hizmetleri
  // Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â

  {
    id: 'D-01', kod_adi: 'MÃƒÅ“HÃƒÅ“RDAR',
    rol: 'Audit loglama, mÃƒÂ¼hÃƒÂ¼rleme, arÃ…Å¸ivleme, SHA-256 kanÃ„Â±t ÃƒÂ¼retimi',
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
    rol: 'CI/CD, deployment, git iÃ…Å¸lemleri, Vercel deploy, GitHub Actions yÃƒÂ¶netimi',
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
    rol: 'AraÃ…Å¸tÃ„Â±rma birincil Ã¢â‚¬â€ trend analizi, beceri haritasÃ„Â±, pazar araÃ…Å¸tÃ„Â±rmasÃ„Â±',
    katman: 'DESTEK',
    beceri_listesi: ['arastirma', 'analiz', 'rapor_uretme', 'veri_siniflandirma', 'trend_analizi', 'beceri_haritasi'],
    kapsam_siniri: ['kod_yazma', 'veritabani_degistirme', 'terminal_komutu'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['bridgeService'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'D-04', kod_adi: 'KÃƒâ€“PRÃƒÅ“',
    rol: 'DÃ„Â±Ã…Å¸ sistem entegrasyonu Ã¢â‚¬â€ harici API, SKM kÃƒÂ¶prÃƒÂ¼sÃƒÂ¼, veri senkronizasyon',
    katman: 'DESTEK',
    beceri_listesi: ['dis_sistem_baglantisi', 'api_entegrasyon', 'veri_senkronizasyon', 'saglik_kontrolu', 'latency_izleme'],
    kapsam_siniri: ['kod_yazma', 'frontend_tasarim', 'karar_verme'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['bridgeService', 'auditService'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'D-05', kod_adi: 'NÃƒâ€“BETÃƒâ€¡Ã„Â°',
    rol: 'Alarm ve monitoring Ã¢â‚¬â€ 7/24 sistem izleme, anomali tespiti, eÃ…Å¸ik kontrolÃƒÂ¼',
    katman: 'DESTEK',
    beceri_listesi: ['alarm_yonetimi', 'monitoring', 'saglik_kontrolu', 'anomali_tespiti', 'bildirim_gonderme', 'esik_izleme'],
    kapsam_siniri: ['kod_yazma', 'is_plani', 'frontend_tasarim'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['alarmService', 'telegramNotifier', 'auditService'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'D-06', kod_adi: 'DOKÃƒÅ“MANTER',
    rol: 'Teknik dokÃƒÂ¼mantasyon Ã¢â‚¬â€ README, API docs, Ã…Å¸ema diyagramlarÃ„Â±, deÃ„Å¸iÃ…Å¸iklik gÃƒÂ¼nlÃƒÂ¼Ã„Å¸ÃƒÂ¼',
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
    rol: 'Sistem hafÃ„Â±zasÃ„Â± Ã¢â‚¬â€ uzun sÃƒÂ¼reli baÃ„Å¸lam, ÃƒÂ¶nceki kararlar, pattern arÃ…Å¸ivi',
    katman: 'DESTEK',
    beceri_listesi: ['baglam_yonetimi', 'uzun_donem_hafiza', 'pattern_arsivi', 'karar_gecmisi', 'oturum_yonetimi'],
    kapsam_siniri: ['kod_yazma', 'frontend_tasarim', 'deployment'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['supabase', 'selfLearningEngine'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'D-08', kod_adi: 'HABERCÃ„Â°',
    rol: 'Bildirim hub Ã¢â‚¬â€ Telegram, email, webhook bildirim orkestrasyonu',
    katman: 'DESTEK',
    beceri_listesi: ['telegram_bildirim', 'email_bildirim', 'webhook_bildirim', 'bildirim_onceliklendirme', 'kanal_secimi'],
    kapsam_siniri: ['kod_yazma', 'veritabani_islemleri', 'karar_verme'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['telegramNotifier', 'auditService'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'D-09', kod_adi: 'ANALÃ„Â°ST',
    rol: 'Ã„Â°statistik ve metrik analizi Ã¢â‚¬â€ KPI takibi, trend grafikleri, karar destek',
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
    rol: 'Proje planlama Ã¢â‚¬â€ sprint, milestone, gÃƒÂ¶rev aÃ„Å¸acÃ„Â±, baÃ„Å¸Ã„Â±mlÃ„Â±lÃ„Â±k haritasÃ„Â±',
    katman: 'DESTEK',
    beceri_listesi: ['sprint_planlama', 'milestone_yonetimi', 'gorev_agaci', 'bagimlilik_haritasi', 'gantt', 'kaynak_tahsisi'],
    kapsam_siniri: ['kod_yazma', 'veritabani_islemleri'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['supabase', 'auditService'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'D-11', kod_adi: 'Ãƒâ€¡EVÃ„Â°RMEN',
    rol: 'Ãƒâ€¡ok dilli destek Ã¢â‚¬â€ i18n, TR/EN/AR ÃƒÂ§eviri, RTL uyumu, yerelleÃ…Å¸tirme',
    katman: 'DESTEK',
    beceri_listesi: ['i18n', 'ceviri', 'yerellestime', 'rtl_destek', 'kulturel_uyum', 'dil_kontrolu'],
    kapsam_siniri: ['kod_yazma', 'veritabani_islemleri', 'karar_verme'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['dosya_sistemi'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'D-12', kod_adi: 'YEDEKÃƒâ€¡I',
    rol: 'Yedek ve kurtarma Ã¢â‚¬â€ otomatik yedek, felaket kurtarma, rollback, snapshot',
    katman: 'DESTEK',
    beceri_listesi: ['otomatik_yedek', 'felakat_kurtarma', 'rollback', 'snapshot', 'veri_kurtarma', 'replikasyon'],
    kapsam_siniri: ['frontend_tasarim', 'ui_ux', 'karar_verme'],
    ogrenme_kapasitesi: false,
    bagimliliklari: ['supabase', 'dosya_sistemi'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'D-13', kod_adi: 'Ãƒâ€“NBELLEK',
    rol: 'Cache yÃƒÂ¶netimi Ã¢â‚¬â€ Redis, in-memory cache, TTL stratejisi, invalidasyon',
    katman: 'DESTEK',
    beceri_listesi: ['cache_yonetimi', 'ttl_stratejisi', 'invalidasyon', 'redis', 'in_memory_cache', 'cdn_yonetimi'],
    kapsam_siniri: ['frontend_tasarim', 'is_plani', 'karar_verme'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['supabase'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'D-14', kod_adi: 'OPTÃ„Â°MÃ„Â°ZÃƒâ€“R',
    rol: 'Sistem optimizasyonu Ã¢â‚¬â€ algoritma iyileÃ…Å¸tirme, DB sorgu, bundle kÃƒÂ¼ÃƒÂ§ÃƒÂ¼ltme',
    katman: 'DESTEK',
    beceri_listesi: ['algoritma_iyilestirme', 'db_sorgu_optimizasyon', 'bundle_kucultme', 'lazy_loading', 'kod_profiling'],
    kapsam_siniri: ['is_plani', 'karar_verme', 'guvenlik_denetimi'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['auditService'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'D-15', kod_adi: 'DEDEKTÃ„Â°F',
    rol: 'Hata ayÃ„Â±klama ve kÃƒÂ¶k neden analizi Ã¢â‚¬â€ stack trace, log analizi, reproduksiyon',
    katman: 'DESTEK',
    beceri_listesi: ['hata_ayiklama', 'kok_neden_analizi', 'stack_trace', 'log_analizi', 'reproduksiyon', 'bug_report'],
    kapsam_siniri: ['frontend_tasarim', 'deployment', 'is_plani'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['auditService', 'selfLearningEngine'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'D-16', kod_adi: 'KORDÃ„Â°NATÃƒâ€“R',
    rol: 'Ajan koordinasyonu Ã¢â‚¬â€ gÃƒÂ¶rev daÃ„Å¸Ã„Â±lÃ„Â±mÃ„Â±, iÃ…Å¸ kuyruÃ„Å¸u, kapasite yÃƒÂ¶netimi',
    katman: 'DESTEK',
    beceri_listesi: ['gorev_dagitimi', 'is_kuyrugu', 'kapasite_yonetimi', 'ajan_koordinasyon', 'paralel_yurutme'],
    kapsam_siniri: ['kod_yazma', 'frontend_tasarim'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['auditService'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'D-17', kod_adi: 'SÃ„Â°NYAL',
    rol: 'Event sistemi Ã¢â‚¬â€ pub/sub, event bus, gerÃƒÂ§ek zamanlÃ„Â± bildirim, SSE/WebSocket',
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
    rol: 'Kural motoru Ã¢â‚¬â€ iÃ…Å¸ kurallarÃ„Â±, politika uygulama, uyum denetimi',
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
    rol: 'Raporlama motoru Ã¢â‚¬â€ otomatik rapor, PDF/CSV/JSON export, periyodik ÃƒÂ¶zet',
    katman: 'DESTEK',
    beceri_listesi: ['rapor_uretme', 'pdf_export', 'csv_export', 'json_export', 'periyodik_ozet', 'tablo_olusturma'],
    kapsam_siniri: ['kod_yazma', 'karar_verme', 'deployment'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['supabase', 'auditService'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'D-20', kod_adi: 'FORMATÃƒâ€“R',
    rol: 'Standart ve format Ã¢â‚¬â€ kod stili, naming convention, Ã…Å¸ema standardizasyon',
    katman: 'DESTEK',
    beceri_listesi: ['kod_stili', 'naming_convention', 'sema_standardizasyon', 'prettier', 'eslint_konfig', 'format_belirleme'],
    kapsam_siniri: ['karar_verme', 'deployment', 'guvenlik_denetimi'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['dosya_sistemi'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'D-21', kod_adi: 'TETÃ„Â°KÃƒâ€¡Ã„Â°',
    rol: 'ZamanlayÃ„Â±cÃ„Â± ve tetikleyici Ã¢â‚¬â€ cron jobs, zamanlÃ„Â± gÃƒÂ¶rev, bekleme yÃƒÂ¶netimi',
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
    rol: 'Ãƒâ€¡atÃ„Â±Ã…Å¸ma ÃƒÂ§ÃƒÂ¶zÃƒÂ¼mÃƒÂ¼ Ã¢â‚¬â€ versiyon ÃƒÂ§akÃ„Â±Ã…Å¸masÃ„Â±, merge conflict, anlaÃ…Å¸mazlÃ„Â±k yÃƒÂ¶netimi',
    katman: 'DESTEK',
    beceri_listesi: ['catisma_cozumu', 'merge_conflict', 'anlasmazlik_yonetimi', 'uzlasma', 'versiyonlama'],
    kapsam_siniri: ['kod_yazma', 'deployment', 'veritabani_islemleri'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['auditService'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'D-23', kod_adi: 'MÃƒÅ“HENDÃ„Â°S',
    rol: 'Sistem mÃƒÂ¼hendisliÃ„Å¸i Ã¢â‚¬â€ mimari tasarÃ„Â±m, teknik borÃƒÂ§ yÃƒÂ¶netimi, refactoring',
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
    rol: 'Yeni teknoloji keÃ…Å¸fi Ã¢â‚¬â€ kÃƒÂ¼tÃƒÂ¼phane araÃ…Å¸tÃ„Â±rma, alternatif ÃƒÂ§ÃƒÂ¶zÃƒÂ¼m, POC ÃƒÂ¼retme',
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
    rol: 'Sorgulama motoru Ã¢â‚¬â€ veri sorgulama, filtreleme, arama indeksi, full-text search',
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
    rol: 'Mevzuat uyumu Ã¢â‚¬â€ KVKK, GDPR, eriÃ…Å¸ilebilirlik standartlarÃ„Â±, yasal gereksinimler',
    katman: 'DESTEK',
    beceri_listesi: ['kvkk', 'gdpr', 'yasal_gereksinimler', 'erisim_standartlari', 'veri_minimizasyon', 'onay_yonetimi'],
    kapsam_siniri: ['kod_yazma', 'deployment', 'is_plani'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['auditService'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'D-27', kod_adi: 'Ãƒâ€“LÃƒâ€¡ER',
    rol: 'Ãƒâ€“lÃƒÂ§ÃƒÂ¼m ve izleme Ã¢â‚¬â€ sistem metrikleri, uptime, SLA takibi, kapasite planÃ„Â±',
    katman: 'DESTEK',
    beceri_listesi: ['sistem_metrikleri', 'uptime_takip', 'sla_izleme', 'kapasite_plani', 'olcek_analizi'],
    kapsam_siniri: ['kod_yazma', 'frontend_tasarim', 'karar_verme'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['auditService', 'alarmService'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
  {
    id: 'D-28', kod_adi: 'Ãƒâ€“Ã„ÂRETMEN',
    rol: 'Bilgi transferi Ã¢â‚¬â€ eÃ„Å¸itim materyali, onboarding, best practice aktarÃ„Â±mÃ„Â±',
    katman: 'DESTEK',
    beceri_listesi: ['egitim_materyali', 'onboarding', 'best_practice', 'bilgi_transferi', 'tutorial_uretme', 'pratik_rehber'],
    kapsam_siniri: ['kod_yazma', 'deployment', 'veritabani_islemleri'],
    ogrenme_kapasitesi: true,
    bagimliliklari: ['dosya_sistemi'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },

  // ===========================================================================
  // SİSTEM TAKİP PANELİ / NÄ°ZAM Ã–ZEL EKÄ°BÄ° (8) â€” 4 Ä°ÅŸlem & Denetim Grubu
  // ===========================================================================
  {
    id: 'ANTI-01', kod_adi: 'ANTI-A1',
    rol: 'Antigravity Ãœyesi A1 â€” Aritmetik iÅŸlem icracÄ±sÄ±',
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
    rol: 'Antigravity Ãœyesi A2 â€” Aritmetik iÅŸlem icracÄ±sÄ±',
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
    rol: 'IVDE Codex Ãœyesi C1 â€” Aritmetik iÅŸlem icracÄ±sÄ±',
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
    rol: 'IVDE Codex Ãœyesi C2 â€” Aritmetik iÅŸlem icracÄ±sÄ±',
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
    rol: 'Sistem DenetÃ§isi 1 â€” Sadece kontrol, mÃ¼dahale yasak',
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
    rol: 'Sistem DenetÃ§isi 2 â€” Sadece kontrol, mÃ¼dahale yasak',
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
    rol: 'Sistem DenetÃ§isi 3 â€” Sadece kontrol, mÃ¼dahale yasak',
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
    rol: 'Sistem DenetÃ§isi 4 â€” Sadece kontrol, mÃ¼dahale yasak',
    katman: 'L2',
    beceri_listesi: ['dogrulama', 'islem_kontrolu', 'aritmetik_denetim'],
    kapsam_siniri: ['islem_yapma', 'mudahale_etme'],
    ogrenme_kapasitesi: false,
    bagimliliklari: ['auditService'],
    durum: 'aktif', tamamlanan_gorev: 0, hata_sayisi: 0,
    son_aktif: new Date().toISOString(), olusturulma: new Date().toISOString(),
  },
];

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ REGISTRY SINGLETON Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

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
      action_description: `Yeni ajan kayÃ„Â±t: ${agent.id} (${agent.kod_adi})`,
      metadata: { action_code: 'AGENT_REGISTER', agent_id: agent.id, kod_adi: agent.kod_adi },
    }).catch(() => {});
    return { success: true };
  }

  updateDurum(id: string, durum: AgentStatus): boolean {
    const agent = this.agents.get(id);
    if (!agent) {
      processError(ERR.AGENT_NOT_FOUND, new Error(`Ajan bulunamadÃ„Â±: ${id}`), {
        kaynak: 'agentRegistry.ts', islem: 'UPDATE_DURUM',
      });
      return false;
    }
    agent.durum = durum;
    agent.son_aktif = new Date().toISOString();
    return true;
  }

  /** GÃƒÂ¶rev tamamlandÃ„Â±Ã„Å¸Ã„Â±nda sayaÃƒÂ§ gÃƒÂ¼ncelle + Supabase'e audit yaz */
  recordGorevTamamlama(id: string, basarili: boolean): boolean {
    const agent = this.agents.get(id);
    if (!agent) return false;
    if (basarili) { agent.tamamlanan_gorev++; } else { agent.hata_sayisi++; }
    agent.son_aktif = new Date().toISOString();
    logAudit({
      operation_type: 'EXECUTE',
      action_description: `Ajan sayaÃƒÂ§ gÃƒÂ¼ncelleme: ${id} (${agent.kod_adi}) Ã¢â‚¬â€ ${basarili ? 'baÃ…Å¸arÃ„Â±lÃ„Â±' : 'hata'}`,
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
      processError(ERR.AGENT_UPDATE, new Error(`Ajan ÃƒÂ¶Ã„Å¸renme kapasitesi yok: ${id}`), {
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

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ SINGLETON EXPORT Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

export const agentRegistry = new AgentRegistryManager();


