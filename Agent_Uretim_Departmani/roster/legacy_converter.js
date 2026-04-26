// ============================================================
// ESKÄ° KADRO â†’ YENÄ° KADRO ENTEGRATÃ–RÃœ
// ============================================================
// 58 eski ajanÄ± MilitaryAgent formatÄ±na Ã§evirip takÄ±mlarÄ±na ekler.
// Eski ajanlar silinmez â€” yeni takÄ±mÄ±n ek Ã¼yeleri olarak katÄ±lÄ±r.
// ============================================================

const { ESKI_YENI_ESLESTIRME } = require('./legacy_bridge.js');
const { DISIPLIN, RUTBELER } = require('./types.js');

/**
 * TÃ¼m eski ajanlarÄ± MilitaryAgent formatÄ±na Ã§evirir.
 * @returns {Array} - MilitaryAgent formatÄ±nda eski ajan listesi
 */
function eskiKadroyuDonustur() {
  const donusturulenler = [];

  for (const [eskiId, bilgi] of Object.entries(ESKI_YENI_ESLESTIRME)) {
    donusturulenler.push({
      id: eskiId,
      kod_adi: bilgi.eski_isim,
      takim_kodu: bilgi.yeni_takim,
      uzmanlik_alani: bilgi.yeni_takim_adi,
      gorev_tanimi: `[ESKÄ° KADRO] ${bilgi.sebep}`,
      rutbe: 'UZMAN',
      asama: 'ENTEGRE',
      beceriler: _beceriCikar(eskiId, bilgi),
      kapsam_siniri: [],
      disiplin: DISIPLIN,
      durum: 'aktif',
      kaynak: 'legacy_bridge',
    });
  }

  return donusturulenler;
}

// Eski ajanlarÄ±n becerilerini ID'den Ã§Ä±kar
function _beceriCikar(eskiId, bilgi) {
  const BECERI_MAP = {
    'K-1': ['karar_verme', 'onay_red', 'strateji', 'gorev_atama', 'kriz_yonetimi'],
    'K-2': ['planlama', 'kaynak_tahsis', 'risk_analizi', 'koordinasyon'],
    'K-3': ['durum_analizi', 'tehdit_tespiti', 'anomali_tespiti', 'rapor'],
    'K-4': ['guvenlik_denetim', 'erisim_kontrolu', 'rls_dogrulama', 'ihlal_tespiti'],
    'A-01': ['react', 'nextjs', 'typescript', 'tailwind', 'component_tasarim'],
    'A-02': ['api_route', 'rest', 'middleware', 'typescript', 'servis_katmani'],
    'A-03': ['supabase', 'postgresql', 'migration', 'rls', 'sql'],
    'A-04': ['telegram_bot', 'webhook', 'komut_yonetimi', 'bildirim'],
    'A-05': ['vitest', 'unit_test', 'integration_test', 'mock', 'coverage'],
    'A-06': ['guvenlik_acigi', 'rls_politikasi', 'jwt', 'rate_limiting'],
    'A-07': ['ollama', 'prompt_tasarim', 'ai_entegrasyon', 'model_secimi'],
    'A-08': ['veri_donusum', 'agregasyon', 'format_donusum', 'raporlama'],
    'A-09': ['next_config', 'vercel', 'env_yonetimi', 'build_optimizasyon'],
    'A-10': ['workflow', 'cron', 'pipeline', 'event_driven', 'zamanlama'],
    'B-01': ['kod_inceleme', 'tip_guvenligi', 'hata_yakalama', 'performans_denetim'],
    'B-02': ['fonksiyonel_dogrulama', 'test_sonuclari', 'kanit_toplama'],
    'B-03': ['owasp', 'xss', 'injection', 'kvkk', 'guvenlik_denetim'],
    'B-04': ['response_time', 'bundle_size', 'sorgu_sayisi', 'memory'],
    'B-05': ['veri_butunlugu', 'null_kontrol', 'tip_tutarliligi', 'duplicate'],
    'B-06': ['erisilebilirlik', 'mobil_uyum', 'hata_mesajlari', 'loading_state'],
    'C-01': ['celinski_analiz', 'kanit_degerlendirme', 'nihai_karar'],
    'C-02': ['mimari_degerlendirme', 'teknik_borc', 'uzun_vadeli_etki'],
    'D-01': ['sha256', 'audit_zincir', 'butunluk_dogrulama', 'onay'],
    'D-02': ['cron', 'webhook', 'event_trigger', 'batch_islem'],
    'D-03': ['arge', 'deney', 'prototip', 'arastirma'],
    'D-04': ['servis_kopruleme', 'baglanti', 'adaptasyon', 'ceviri'],
    'D-05': ['canli_izleme', 'nobet', 'alarm_yonetimi', 'uptime'],
    'D-06': ['otomatik_dokuman', 'sema_belgeleme', 'changelog'],
    'D-07': ['baglam_hafiza', 'veri_saklama', 'session', 'cache'],
    'D-08': ['bildirim', 'mesaj_iletimi', 'rapor_gonderme'],
    'D-09': ['veri_analiz', 'trend_tespiti', 'kpi_hesaplama', 'tahminleme'],
    'D-10': ['proje_planlama', 'timeline', 'onceliklendirme', 'kaynak_tahsis'],
    'D-11': ['format_cevirme', 'dil_donusumu', 'lokalizasyon'],
    'D-12': ['yedekleme', 'snapshot', 'kurtarma', 'replikasyon'],
    'D-13': ['cache_yonetimi', 'onbellek', 'hiz_optimizasyon'],
    'D-14': ['kaynak_optimizasyon', 'performans_iyilestirme', 'tuning'],
    'D-15': ['kok_neden', 'sorusturma', 'iz_surme', 'analiz'],
    'D-16': ['koordinasyon', 'is_dagitimi', 'surec_yonetimi'],
    'D-17': ['sinyal', 'event_tetikleme', 'alarm', 'bildirim'],
    'D-18': ['kural_motoru', 'doktrin', 'politika_uygulama'],
    'D-19': ['rapor_uretimi', 'ozet_cikarma', 'veri_gorsellestirme'],
    'D-20': ['kod_formatlama', 'veri_formatlama', 'standart_uygulama'],
    'D-21': ['trigger', 'pipeline_tetikleme', 'event_yonetimi'],
    'D-22': ['uzlastirma', 'cakisma_cozumu', 'arabuluculuk'],
    'D-23': ['altyapi_muhendisligi', 'sistem_konfigurasyonu', 'devops'],
    'D-24': ['kesif', 'firsat_tespiti', 'pazar_analizi'],
    'D-25': ['soru_uretme', 'eksik_tespit', 'gereksinim_cikarma'],
    'D-26': ['uyumluluk', 'standart_kontrol', 'regulator'],
    'D-27': ['metrik_olcme', 'degerlendirme', 'kpi'],
    'D-28': ['egitim', 'rehberlik', 'adaptasyon', 'onboarding'],
    'ANTI-01': ['aritmetik', 'saglama', 'dogruluk_kontrolu'],
    'ANTI-02': ['aritmetik', 'saglama', 'dogruluk_kontrolu'],
    'IVDE-01': ['codex_motor', 'hassas_hesaplama', 'deterministik'],
    'IVDE-02': ['codex_motor', 'hassas_hesaplama', 'deterministik'],
    'CNTRL-01': ['sonuc_dogrulama', 'mantik_hatasi', 'kabul_red'],
    'CNTRL-02': ['sonuc_dogrulama', 'mantik_hatasi', 'kabul_red'],
    'CNTRL-03': ['sonuc_dogrulama', 'mantik_hatasi', 'kabul_red'],
    'CNTRL-04': ['sonuc_dogrulama', 'mantik_hatasi', 'kabul_red'],
    'L-1': ['debugging', 'sozdizimi', 'mantik_hatasi', 'bug_tespiti'],
    'L-2': ['sistem_kontrol', 'kural_uyumu', 'denetim_raporu'],
    'L-3': ['sizma_testi', 'zero_day', 'risk_denetimi'],
    'L-4': ['token_optimizasyon', 'hizlandirma', 'kaynak_optimizasyon'],
    'G-8': ['loglama', 'dokumantasyon', 'onayleme', 'arsiv'],
  };

  return BECERI_MAP[eskiId] || [bilgi.sebep.split(',')[0].trim().toLowerCase().replace(/\s+/g, '_')];
}

module.exports = { eskiKadroyuDonustur };

