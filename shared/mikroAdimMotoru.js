// ============================================================
// MİKRO ADIM MOTORU — ZORUNLU ALGORİTMİK YÜRÜTME KATMANI
// ============================================================
// TÜM AJAN VE YAPAY ZEKALAR BU MOTORDAN GEÇER.
// Hiçbir işlem adım atlatarak ilerleyemez.
// Hiçbir işlem onay alınmadan "tamamlandı" sayılmaz.
//
// DURUM MAKİNESİ:
//   beklemede → hazırlık → [adımlar: N×(yürütme→ara_kontrol)] → onay_bekliyor → tamamlandı
//                                                                              ↘ reddedildi
//
// ONAY KANALI: Supabase tasks tablosu (status = 'onay_bekliyor')
//   Onay: WhatsApp "ONAYLA TASK-ID" komutu veya Frontend paneli
// ============================================================

'use strict';
const fs   = require('fs');
const path = require('path');

// ── YAPILANDIRMA ─────────────────────────────────────────────
const MOTOR_LOG = path.join(__dirname, '..', 'Planlama_Departmani', 'mikro_adim.log');
const MAX_LOG   = 5 * 1024 * 1024; // 5MB rotasyon

// ── DURUM KODLARI ────────────────────────────────────────────
const DURUM = {
  BEKLEMEDE:       'beklemede',
  HAZIRLIK:        'hazirlik',
  YURUTME:         'yurutme',
  ARA_KONTROL:     'ara_kontrol',
  ONAY_BEKLIYOR:   'onay_bekliyor',
  TAMAMLANDI:      'tamamlandi',
  REDDEDILDI:      'reddedildi',
  HATA:            'hata',
  DURDURULDU:      'durduruldu',
};

// ── LOG YAZICI ───────────────────────────────────────────────
function motorLog(seviye, mesaj, veri = {}) {
  try {
    if (fs.existsSync(MOTOR_LOG) && fs.statSync(MOTOR_LOG).size > MAX_LOG) {
      fs.renameSync(MOTOR_LOG, MOTOR_LOG.replace('.log', `_${Date.now()}.log`));
    }
    const satir = JSON.stringify({
      ts:     new Date().toISOString(),
      seviye,
      mesaj,
      ...veri,
    });
    fs.appendFileSync(MOTOR_LOG, satir + '\n', 'utf-8');
    console.log(`[MİKRO_MOTOR] [${seviye}] ${mesaj}`);
  } catch (e) {
    console.error(`[MİKRO_MOTOR LOG HATA]: ${e.message}`);
  }
}

// ── MİKRO ADIM ŞEMASI ────────────────────────────────────────
/**
 * MikroAdim — Her adım bu yapıya uymalı.
 * @typedef {{
 *   no:      number,
 *   ad:      string,
 *   aciklama: string,
 *   fn:      () => Promise<{ gecti: boolean, cikti: any, hata?: string }>,
 * }} MikroAdim
 */

// ── ANA MOTOR ────────────────────────────────────────────────
class MikroAdimMotoru {
  /**
   * @param {string} gorevId          Supabase task ID
   * @param {string} gorevBaslik      Görev başlığı
   * @param {MikroAdim[]} adimlar     Algoritma adımları
   * @param {object?} supabase        Supabase client (opsiyonel — yoksa sadece log yazar)
   */
  constructor(gorevId, gorevBaslik, adimlar, supabase = null) {
    this.gorevId     = gorevId;
    this.gorevBaslik = gorevBaslik;
    this.adimlar     = adimlar;
    this.supabase    = supabase;
    this.durum       = DURUM.BEKLEMEDE;
    this.adimSonuclari = [];
    this.baslangic   = null;
    this.bitis       = null;

    // Doğrulama: adımlar boş olamaz
    if (!Array.isArray(adimlar) || adimlar.length === 0) {
      throw new Error(`[MİKRO_MOTOR] HATA: ${gorevId} — Adım listesi boş. Kural #2 ADIM_ATLAMA_YASAK.`);
    }

    // Doğrulama: her adım fn fonksiyonu içermeli
    for (const adim of adimlar) {
      if (typeof adim.fn !== 'function') {
        throw new Error(`[MİKRO_MOTOR] HATA: Adım ${adim.no} (${adim.ad}) — fn fonksiyonu eksik.`);
      }
    }
  }

  // ── DURUM GÜNCELLE ─────────────────────────────────────────
  async _supabaseDurumGuncelle(yeniDurum, metadata = {}) {
    if (!this.supabase) return;
    try {
      await this.supabase.from('tasks').update({
        status:     yeniDurum,
        updated_at: new Date().toISOString(),
        metadata: {
          ...metadata,
          motor_durum:    yeniDurum,
          adim_sayisi:    this.adimlar.length,
          tamamlanan:     this.adimSonuclari.filter(s => s.gecti).length,
          mikro_motor_v:  '1.0',
        },
      }).eq('id', this.gorevId);
    } catch (e) {
      motorLog('WARN', `Supabase güncelleme başarısız: ${e.message}`, { gorevId: this.gorevId });
    }
  }

  // ── ÇALIŞTIR ───────────────────────────────────────────────
  async calistir() {
    this.baslangic = Date.now();
    this.durum     = DURUM.HAZIRLIK;

    motorLog('INFO', `▶ BAŞLIYOR: "${this.gorevBaslik}"`, {
      gorevId: this.gorevId,
      adim_sayisi: this.adimlar.length,
    });

    await this._supabaseDurumGuncelle(DURUM.HAZIRLIK);

    // ── ADIM DÖNGÜSÜ ─────────────────────────────────────────
    for (let i = 0; i < this.adimlar.length; i++) {
      const adim = this.adimlar[i];
      this.durum = DURUM.YURUTME;

      motorLog('INFO', `  [${adim.no}/${this.adimlar.length}] ADIM BAŞLADI: ${adim.ad}`, {
        gorevId: this.gorevId, adimNo: adim.no, adimAd: adim.ad,
      });

      let sonuc;
      try {
        sonuc = await Promise.race([
          adim.fn(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('TIMEOUT — Adım 300sn aştı')), 300_000)
          ),
        ]);
      } catch (e) {
        sonuc = { gecti: false, cikti: null, hata: e.message };
      }

      this.adimSonuclari.push({
        no:    adim.no,
        ad:    adim.ad,
        gecti: sonuc.gecti,
        cikti: sonuc.cikti,
        hata:  sonuc.hata || null,
        ts:    new Date().toISOString(),
      });

      // ── ARA KONTROL ────────────────────────────────────────
      this.durum = DURUM.ARA_KONTROL;

      if (!sonuc.gecti) {
        // ADIM BAŞARISIZ — tüm işlem durur
        this.durum = DURUM.HATA;
        motorLog('HATA', `  ❌ ADIM BAŞARISIZ: ${adim.ad} — ${sonuc.hata || 'Bilinmeyen hata'}`, {
          gorevId: this.gorevId, adimNo: adim.no,
        });
        await this._supabaseDurumGuncelle(DURUM.HATA, {
          hata_adim: adim.no, hata_mesaj: sonuc.hata,
        });
        return this._raporOlustur(false);
      }

      motorLog('INFO', `  ✅ ADIM TAMAM: ${adim.ad}`, {
        gorevId: this.gorevId, adimNo: adim.no,
      });
    }

    // ── TÜM ADIMLAR TAMAMLANDI — ONAY BEKLİYOR ──────────────
    this.durum = DURUM.ONAY_BEKLIYOR;
    this.bitis = Date.now();

    motorLog('INFO', `⏳ ONAY BEKLİYOR: "${this.gorevBaslik}" — ${this.adimlar.length} adım tamamlandı.`, {
      gorevId: this.gorevId,
      sure_ms: this.bitis - this.baslangic,
    });

    await this._supabaseDurumGuncelle(DURUM.ONAY_BEKLIYOR, {
      sure_ms:  this.bitis - this.baslangic,
      mesaj:    `Tüm ${this.adimlar.length} adım tamamlandı. İnsan onayı bekleniyor.`,
    });

    // NOT: TAMAMLANDI durumuna SADECE onayOnay() çağrıldığında geçilir.
    return this._raporOlustur(true);
  }

  // ── ONAYLA ─────────────────────────────────────────────────
  async onayla(onaylayanKisi = 'SISTEM') {
    if (this.durum !== DURUM.ONAY_BEKLIYOR) {
      motorLog('WARN', `Onay reddedildi — durum zaten: ${this.durum}`, { gorevId: this.gorevId });
      return { basarili: false, mesaj: `Onay verilemez — mevcut durum: ${this.durum}` };
    }

    this.durum = DURUM.TAMAMLANDI;

    motorLog('INFO', `✅ ONAYLANDI: "${this.gorevBaslik}" — Onaylayan: ${onaylayanKisi}`, {
      gorevId: this.gorevId, onaylayanKisi,
    });

    await this._supabaseDurumGuncelle(DURUM.TAMAMLANDI, {
      onaylayan:  onaylayanKisi,
      onay_ts:    new Date().toISOString(),
    });

    return { basarili: true, mesaj: `Görev onaylandı ve tamamlandı: ${this.gorevId}` };
  }

  // ── REDDET ─────────────────────────────────────────────────
  async reddet(neden = '', reddeden = 'SISTEM') {
    if (this.durum !== DURUM.ONAY_BEKLIYOR) {
      return { basarili: false, mesaj: `Ret verilemez — mevcut durum: ${this.durum}` };
    }

    this.durum = DURUM.REDDEDILDI;

    motorLog('WARN', `❌ REDDEDİLDİ: "${this.gorevBaslik}" — Neden: ${neden}`, {
      gorevId: this.gorevId, reddeden, neden,
    });

    await this._supabaseDurumGuncelle(DURUM.REDDEDILDI, {
      reddeden, neden, red_ts: new Date().toISOString(),
    });

    return { basarili: false, mesaj: `Görev reddedildi: ${neden}` };
  }

  // ── RAPOR ──────────────────────────────────────────────────
  _raporOlustur(basarili) {
    return {
      gorevId:         this.gorevId,
      gorevBaslik:     this.gorevBaslik,
      durum:           this.durum,
      basarili,
      adim_sayisi:     this.adimlar.length,
      tamamlanan:      this.adimSonuclari.filter(s => s.gecti).length,
      sure_ms:         this.bitis ? this.bitis - this.baslangic : null,
      adim_sonuclari:  this.adimSonuclari,
      onay_bekleniyor: this.durum === DURUM.ONAY_BEKLIYOR,
    };
  }
}

// ── YARDIMCI: Adım Fabrikası ─────────────────────────────────
/**
 * adimOlustur — Hızlı adım tanımı için yardımcı.
 */
function adimOlustur(no, ad, aciklama, fn) {
  return { no, ad, aciklama, fn };
}

/**
 * standartGörevAdımlari — Her AI görevi için zorunlu temel adımlar.
 * Kullanım: Bu adımları görev-özel adımlarla birleştir.
 */
function standartGörevAdımlari(gorevMetni, ajanId) {
  return [
    // ── ADIM 1: GİRDİ DOĞRULAMA (F-016) ────────────────────
    // KURAL: Keyfi rakam sınırı yok.
    // Sadece 3 gerçek anlamsızlık durumu engellenir:
    //   1. Boş/null girdi        → işlenemez
    //   2. Hiç harf içermeyen   → "12345!!!" — komut değil
    //   3. Tek karakter tekrarı → "aaaaaaa"  — anlamsız
    // Gerçek kalite denetimi: komut_alim.js'deki 15 nokta protokolü.
    adimOlustur(1, 'GİRDİ DOĞRULAMA', 'F-016: Anlamsız girdi engeli', async () => {
      // NULL / BOŞ
      if (!gorevMetni || typeof gorevMetni !== 'string' || gorevMetni.trim().length === 0) {
        return { gecti: false, cikti: null, hata: 'F-016: Girdi boş veya null — işlenemez.' };
      }

      const temiz = gorevMetni.trim();

      // HİÇ HARF YOK — saf sembol, rakam, noktalama
      const harfVar = /[a-zA-ZğüşıöçĞÜŞİÖÇ]/.test(temiz);
      if (!harfVar) {
        return {
          gecti: false, cikti: null,
          hata: `F-016: Komut hiç harf içermiyor: "${temiz.slice(0, 30)}" — Türkçe veya İngilizce kelime gerekli.`
        };
      }

      // TEK KARAKTER TEKRARI — "aaaaaaa", "........"
      const tekilKarakter = /^(.)\1{9,}$/.test(temiz); // aynı karakter 10+ kez
      if (tekilKarakter) {
        return {
          gecti: false, cikti: null,
          hata: `F-016: Komut anlamsız tekrar — "${temiz.slice(0, 20)}..."`
        };
      }

      // GEÇTİ — gerisi komut_alim.js'in işi
      return { gecti: true, cikti: { uzunluk: temiz.length } };
    }),

    // ── ADIM 2: AJAN KAPSAM KİLİDİ ─────────────────────────
    adimOlustur(2, 'AJAN KAPSAM KILIDI', 'Ajanın bu göreve yetkisi var mı?', async () => {
      if (!ajanId) {
        return { gecti: false, cikti: null, hata: 'Ajan kimliği belirsiz — KAPSAM_KİLİDİ ihlali' };
      }
      return { gecti: true, cikti: { ajanId } };
    }),

    // ── ADIM 3: F-003 KONTROL ────────────────────────────────
    // Mediokrite kelimeleri — "minimum", "yeterli", "makul"
    adimOlustur(3, 'F-003 KONTROL', 'Mediokrite kelimeleri taranıyor', async () => {
      const yasaklar = ['minimum', 'yeterli', 'makul', 'kabul edilebilir', 'idare'];
      const bul = yasaklar.find(k => gorevMetni.toLowerCase().includes(k));
      if (bul) {
        return { gecti: false, cikti: null, hata: `F-003: Yasaklı kelime tespit edildi: "${bul}"` };
      }
      return { gecti: true, cikti: { f003: 'PASS' } };
    }),
  ];
}



// ── EXPORTS ──────────────────────────────────────────────────
module.exports = {
  MikroAdimMotoru,
  adimOlustur,
  standartGörevAdımlari,
  DURUM,
};
