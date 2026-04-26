// ============================================================
// BECERİ GENİŞLEME ENJEKSİYONU — MDS-160 UYUMLU
// ============================================================
// GAP ANALİZİ: 39 kritik beceri eksik tespit edildi (2026-04-25)
// YÖNTEM: Mevcut phase dosyalarını değiştirmeden, ilgili takımlara
//         'beceriler' dizisine ek yetkinlik enjekte et.
//
// KURAL: Takım kapsam_siniri ihlal edilmez.
//        Her beceri SADECE uygun olan takıma eklenir.
//
// KATEGORİ HARİTASI:
//   E-Ticaret    → MK (Maliyet), GA (Gereksinim), VA (Veri Akışı), PO (Performans)
//   Finans       → MK (Maliyet ve Kaynak)
//   Müşteri/NLP  → UX (Kullanıcı Deneyimi), EA (Eğitim ve Adaptasyon)
//   Lojistik     → OP (Operasyon), CI (Canlı İzleme)
//   Kamera/CV    → CI (Canlı İzleme), VA (Veri Akışı)
//   Sosyal/SEO   → UX (Kullanıcı Deneyimi), DK (Dokümantasyon)
//   İnsan Kayn.  → EA (Eğitim ve Adaptasyon), MK (Maliyet ve Kaynak)
//   ML/AI Teknik → VA (Veri Akışı), TS (Teknoloji Seçimi), VM (Veri Modelleme)
// ============================================================

const BECERI_GENISLEME = Object.freeze({

  // ── GA: GEREKSİNİM ANALİZİ ──────────────────────────────
  // E-ticaret gereksinim analizi ekleniyor
  GA: ['e_ticaret_gereksinim', 'pazar_analizi', 'rakip_analizi',
       'kategori_yonetimi', 'urun_katalogu_analizi'],

  // ── MK: MALİYET VE KAYNAK ───────────────────────────────
  // Finans + E-ticaret maliyet becerileri
  MK: ['kar_zarar_analizi', 'fatura_yonetimi', 'vergi_planlama',
       'nakit_akisi', 'finansal_rapor', 'e_ticaret_fiyatlandirma',
       'stok_maliyet_analizi', 'personel_takip', 'izin_yonetimi'],

  // ── ZP: ZAMAN PLANLAMASI ────────────────────────────────
  // Vardiya ve personel zamanlama
  ZP: ['vardiya_planlama', 'performans_degerlendirme',
       'is_yukleme_dengesi', 'kaynak_takvimi'],

  // ── VM: VERİ MODELLEMESİ ────────────────────────────────
  // Makine öğrenmesi veri yapıları + RAG
  VM: ['vector_db', 'embedding', 'rag_pipeline',
       'veri_ambar', 'feature_engineering', 'veri_etiketleme'],

  // ── TS: TEKNOLOJİ SEÇİMİ ────────────────────────────────
  // ML/AI çerçeve seçimi
  TS: ['model_egitimi', 'fine_tuning', 'llm_entegrasyon',
       'ai_cerceve_secimi', 'gpu_gereksinimleri', 'mlops'],

  // ── UX: KULLANICI DENEYİMİ ──────────────────────────────
  // NLP, duygu analizi, müşteri iletişimi, sosyal medya
  UX: ['nlp_turkce', 'duygu_analizi', 'sohbet_botu',
       'musteri_segmentasyonu', 'sikayet_yonetimi',
       'instagram_api', 'sosyal_medya_analizi'],

  // ── VA: VERİ AKIŞI VE İŞLEME ────────────────────────────
  // Görüntü işleme pipeline, scraping, trendyol
  VA: ['goruntu_isleme', 'kamera_sayim', 'cv_ile_sayim',
       'trendyol_scraping', 'urun_seo', 'veri_pipeline_ai'],

  // ── PO: PERFORMANS VE ÖLÇEKLENDİRME ────────────────────
  // E-ticaret performans ve SEO teknik analizi
  PO: ['seo_analizi', 'anahtar_kelime', 'sayfa_hiz_optimizasyon',
       'e_ticaret_performans'],

  // ── CI: CANLI İZLEME VE ALARM ───────────────────────────
  // Üretim hattı izleme + kamera akışı
  CI: ['uretim_hizi_takip', 'bant_analizi', 'kamera_akis_izleme',
       'kalite_kontrol_izleme'],

  // ── OP: OPERASYON ────────────────────────────────────────
  // Lojistik + depo + kargo operasyonu
  OP: ['kargo_takip', 'teslimat_optimizasyon', 'depo_yonetimi',
       'iade_sureci', 'tedarik_zinciri', 'siparis_yonetimi'],

  // ── DK: DOKÜMANTASYON ───────────────────────────────────
  // SEO içerik + ürün açıklaması yazarlığı
  DK: ['icerik_uretimi', 'urun_aciklamasi_yazarligi',
       'seo_icerik', 'google_ads_metin'],

  // ── EA: EĞİTİM VE KULLANICI ADAPTASYONU ─────────────────
  // Müşteri eğitimi + NLP chatbot eğitimi
  EA: ['musteri_egitimi', 'nlp_botu_egitimi',
       'chatbot_senaryo_yazimi', 'kullanici_geri_bildirim_analizi'],

  // ── EN: ENTEGRASYON ──────────────────────────────────────
  // E-ticaret API entegrasyonları
  EN: ['trendyol_api', 'google_ads_api', 'instagram_api_entegrasyon',
       'kargo_api_entegrasyonu', 'erp_entegrasyonu'],

  // ── SD: SİSTEM DENETİMİ ─────────────────────────────────
  // ML model güvenilirlik denetimi
  SD: ['model_drift_denetimi', 'ai_karar_audit',
       'halusinasyon_denetimi', 'bias_denetimi'],
});

/**
 * Tüm kadro listesine eksik becerileri enjekte eder.
 * Mevcut beceri listesine EKLEME yapar, silme veya değiştirme yapmaz.
 *
 * @param {Array} kadro - TAM_KADRO dizisi
 * @returns {Array} - Genişletilmiş kadro (yeni dizi, orijinali değişmez)
 */
function beceriGenislet(kadro) {
  return kadro.map(ajan => {
    const ekBeceriler = BECERI_GENISLEME[ajan.takim_kodu];
    if (!ekBeceriler || ekBeceriler.length === 0) return ajan;

    // Mevcut becerilerle birleştir, tekrar olmasın, kapsam_siniri ihlal etme
    const kapsamSiniri = new Set(ajan.kapsam_siniri || []);
    const filtrelenmis = ekBeceriler.filter(b => !kapsamSiniri.has(b));
    const yeniBeceriler = [...new Set([...(ajan.beceriler || []), ...filtrelenmis])];

    return Object.freeze({
      ...ajan,
      beceriler: yeniBeceriler,
      _beceri_genisleme: true,   // flag — genişleme uygulandı
    });
  });
}

/**
 * Hangi takıma kaç yeni beceri eklendi — özet rapor
 * @param {Array} eskiKadro - genişlemeden önceki kadro
 * @param {Array} yeniKadro - genişlemeden sonraki kadro
 */
function beceriGenislemeRaporu(eskiKadro, yeniKadro) {
  const rapor = {};
  for (let i = 0; i < eskiKadro.length; i++) {
    const eski = eskiKadro[i];
    const yeni = yeniKadro[i];
    const fark = (yeni.beceriler?.length || 0) - (eski.beceriler?.length || 0);
    if (fark > 0) {
      rapor[eski.takim_kodu] = rapor[eski.takim_kodu] || { takim: eski.uzmanlik_alani, eklenen: 0 };
      rapor[eski.takim_kodu].eklenen = Math.max(rapor[eski.takim_kodu].eklenen, fark);
    }
  }
  return rapor;
}

module.exports = { BECERI_GENISLEME, beceriGenislet, beceriGenislemeRaporu };
