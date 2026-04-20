// ============================================================
// DAĞITIM MOTORU — GERÇEK AJAN BAĞLANTILI
// ============================================================
// Projesi : Sistem Takip Paneli (STP)
// Konum   : modules/dispatcher/dispatcher.js
// Tarih   : 2026-04-19
//
// GÖREV: Görevleri gerçek ajan havuzuna (WorkerPool) dağıtır.
//   - worker_core.js → 22 gerçek ajan (K-1...C-02)
//   - eslestir()     → Görev metninden en uygun ajan tespiti
//   - AgentWorker    → Gerçek execute() çalıştırma
//
// AKIŞ:
//   Görev gelir → Kuyruk → eslestir(görev) → AjanID belirlenir
//   → WorkerPool.get(ajanId) → worker.execute(görev) → Sonuç
//   → Sonraki adım (kontrol, onay, kapanış)
//
// ADIMLAR:
//   1. PLAN      → K-2 KURMAY planlama onayı
//   2. VALIDATE  → B-02 DENETÇİ-DOĞRULA ön kontrol
//   3. EXECUTE   → eslestir() ile bulunan gerçek ajan
//   4. AUDIT     → B-01 DENETÇİ-KOD sonuç denetimi
//   5. APPROVE   → K-1 KOMUTAN nihai onay
//
// KULLANIM:
//   const dispatcher = require('./modules/dispatcher/dispatcher');
//   dispatcher.gorevEkle({ baslik: 'Frontend düzelt', icerik: '...', oncelik: 'yuksek' });
//   dispatcher.durumRaporu();
//   dispatcher.durdur();
// ============================================================

'use strict';

const { EventEmitter } = require('events');
const path = require('path');
const fs = require('fs');

// ── GERÇEK AJAN BAĞLANTISI ──────────────────────────────────
const {
  WorkerPool,
  eslestir,
  generateJobId,
  WORKER_DURUMLARI,
  YETENEK_MATRISI,
} = require(path.join(__dirname, '../../agents/worker_core'));

// ── YAPILANDIRMA ─────────────────────────────────────────────
const AYARLAR = {
  KUYRUK_LIMIT      : 200,
  DISPATCH_ARALIK_MS: 500,
  MAX_RETRY         : 3,
  GOREV_TIMEOUT_MS  : 120_000,    // 2dk
  GECMIS_LIMIT      : 500,
  LOG_PREFIX        : '[DAĞITIM]',
  DB_FILE           : path.join(__dirname, 'dispatch_state.json'),
};

// ── GÖREV DURUMLARI ──────────────────────────────────────────
const GOREV_DURUM = {
  KUYRUKTA   : 'KUYRUKTA',
  PLANLANIYOR: 'PLANLANIYOR',
  DOGRULANYOR: 'DOGRULANYOR',
  CALISIYOR  : 'CALISIYOR',
  DENETLENIYOR: 'DENETLENIYOR',
  ONAYLANIYOR: 'ONAYLANIYOR',
  TAMAMLANDI : 'TAMAMLANDI',
  HATA       : 'HATA',
  IPTAL      : 'IPTAL',
};

// ── ADIMLAR (5 aşamalı kontrollü akış) ───────────────────────
const ADIMLAR = [
  { ad: 'PLAN',     rol: 'planlama',   varsayilan_ajan: 'K-2', aciklama: 'Kurmay planlama onayı' },
  { ad: 'VALIDATE', rol: 'dogrulama',  varsayilan_ajan: 'B-02', aciklama: 'Ön kontrol / doğrulama' },
  { ad: 'EXECUTE',  rol: 'icra',       varsayilan_ajan: null,   aciklama: 'Gerçek ajan icrası (dinamik)' },
  { ad: 'AUDIT',    rol: 'denetim',    varsayilan_ajan: 'B-01', aciklama: 'Sonuç denetimi' },
  { ad: 'APPROVE',  rol: 'onay',       varsayilan_ajan: 'K-1',  aciklama: 'Komutan nihai onay' },
];


// ══════════════════════════════════════════════════════════════
// DAĞITIM MOTORU
// ══════════════════════════════════════════════════════════════
class DagitimMotoru extends EventEmitter {

  constructor() {
    super();

    /** @type {WorkerPool} Gerçek ajan havuzu — 22 ajan */
    this._pool = new WorkerPool();

    /** @type {Map<string, object>} Aktif görev kuyruğu */
    this._kuyruk = new Map();

    /** @type {object[]} Tamamlanan görev geçmişi */
    this._gecmis = [];

    /** @type {boolean} Dağıtım döngüsü çalışıyor mu */
    this._calisiyor = false;

    /** @type {NodeJS.Timeout|null} Dispatch timer */
    this._timer = null;

    /** @type {boolean} Dispatch lock — race condition önleme */
    this._dispatchLock = false;

    // İstatistikler
    this._istat = {
      toplam_gorev    : 0,
      tamamlanan      : 0,
      hata            : 0,
      iptal           : 0,
      retry            : 0,
      dagitilan       : 0,
      ortalama_sure_ms: 0,
      _toplam_sure    : 0,
    };

    this._log('Motor oluşturuldu — havuzda ' + this._pool.istatistikler().toplam + ' ajan');
  }

  // ══════════════════════════════════════════════════════════════
  // 1. GÖREV EKLEME
  // ══════════════════════════════════════════════════════════════

  /**
   * Yeni görev ekler.
   * @param {object} veri - { baslik, icerik, oncelik, zorunlu_ajan }
   * @returns {{ basarili: boolean, gorev_id: string, hata?: string }}
   */
  gorevEkle(veri) {
    // ── Doğrulama ────────────────────────────────────────────
    if (!veri || typeof veri !== 'object') {
      return { basarili: false, gorev_id: null, hata: 'Geçersiz görev verisi' };
    }
    if (!veri.baslik || typeof veri.baslik !== 'string' || veri.baslik.trim().length < 3) {
      return { basarili: false, gorev_id: null, hata: 'Başlık zorunlu (min 3 karakter)' };
    }
    if (this._kuyruk.size >= AYARLAR.KUYRUK_LIMIT) {
      return { basarili: false, gorev_id: null, hata: `Kuyruk dolu (${AYARLAR.KUYRUK_LIMIT})` };
    }

    // ── Öncelik doğrulama ────────────────────────────────────
    const gecerliOncelikler = { kritik: 4, yuksek: 3, normal: 2, dusuk: 1 };
    const oncelik = gecerliOncelikler[veri.oncelik] ? veri.oncelik : 'normal';

    // ── Ajan eşleştirme (eslestir() ile gerçek ajan bulma) ──
    const eslesme = eslestir(veri.baslik + ' ' + (veri.icerik || ''));
    const icraAjan = veri.zorunlu_ajan || (eslesme.length > 0 ? eslesme[0].ajanId : 'K-1');

    // ── Görev kaydı oluştur ─────────────────────────────────
    const gorevId = `GRV-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const gorev = {
      gorev_id       : gorevId,
      baslik         : veri.baslik.trim(),
      icerik         : (veri.icerik || '').trim() || null,
      oncelik        : oncelik,
      oncelik_puan   : gecerliOncelikler[oncelik],
      durum          : GOREV_DURUM.KUYRUKTA,
      adim           : 0,
      adim_gecmisi   : [],
      icra_ajan      : icraAjan,
      eslesme_skor   : eslesme.length > 0 ? eslesme[0].skor : 0,
      eslesme_detay  : eslesme.slice(0, 3), // Top 3 aday
      retry_sayisi   : 0,
      olusturma      : new Date().toISOString(),
      son_guncelleme : new Date().toISOString(),
      locked         : false,
      version        : 1,
      sonuclar       : {},
      hata_gecmisi   : [],
    };

    this._kuyruk.set(gorevId, gorev);
    this._istat.toplam_gorev++;

    this._log(`📥 Görev eklendi: ${gorevId} → ${gorev.baslik.slice(0, 40)} [${oncelik}] → icra: ${icraAjan}`);
    this.emit('gorev_eklendi', { gorev_id: gorevId, baslik: gorev.baslik, icra_ajan: icraAjan });

    return { basarili: true, gorev_id: gorevId, icra_ajan: icraAjan, eslesme_skor: gorev.eslesme_skor };
  }

  // ══════════════════════════════════════════════════════════════
  // 2. DAĞITIM DÖNGÜSÜ
  // ══════════════════════════════════════════════════════════════

  /**
   * Tek bir dispatch turu — kuyruktaki görevleri adımlarına göre işler.
   */
  async _dispatch() {
    // Race condition koruması
    if (this._dispatchLock) return;
    this._dispatchLock = true;

    try {
      // Öncelik sırasına göre görevleri al
      const gorevler = Array.from(this._kuyruk.values())
        .filter(g => !g.locked && g.durum !== GOREV_DURUM.TAMAMLANDI && g.durum !== GOREV_DURUM.HATA && g.durum !== GOREV_DURUM.IPTAL)
        .sort((a, b) => b.oncelik_puan - a.oncelik_puan);

      for (const gorev of gorevler) {
        await this._gorevIsle(gorev);
      }
    } catch (err) {
      this._log(`❌ Dispatch hatası: ${err.message}`, 'ERROR');
    } finally {
      this._dispatchLock = false;
    }
  }

  /**
   * Tek bir görevi mevcut adımında işler.
   * @param {object} gorev
   */
  async _gorevIsle(gorev) {
    const adimIndex = gorev.adim;
    if (adimIndex >= ADIMLAR.length) {
      // Tüm adımlar tamamlandı
      this._gorevTamamla(gorev);
      return;
    }

    const adim = ADIMLAR[adimIndex];
    gorev.locked = true;
    gorev.son_guncelleme = new Date().toISOString();

    // Durum güncelle
    const durumMap = {
      PLAN: GOREV_DURUM.PLANLANIYOR,
      VALIDATE: GOREV_DURUM.DOGRULANYOR,
      EXECUTE: GOREV_DURUM.CALISIYOR,
      AUDIT: GOREV_DURUM.DENETLENIYOR,
      APPROVE: GOREV_DURUM.ONAYLANIYOR,
    };
    gorev.durum = durumMap[adim.ad] || GOREV_DURUM.CALISIYOR;

    // İcra edecek ajan belirle
    let ajanId;
    if (adim.ad === 'EXECUTE') {
      // EXECUTE adımında eslestir() ile bulunan gerçek ajan
      ajanId = gorev.icra_ajan;
    } else {
      ajanId = adim.varsayilan_ajan;
    }

    // Ajan havuzdan çek
    const worker = this._pool.get(ajanId);
    if (!worker) {
      this._log(`⚠️ Ajan bulunamadı: ${ajanId} — atlıyor`, 'WARN');
      gorev.locked = false;
      return;
    }

    // Worker meşgulse atla
    if (worker.durum === WORKER_DURUMLARI.RUNNING) {
      gorev.locked = false;
      return;
    }

    try {
      const t0 = Date.now();

      // ── GERÇEK AJAN ÇALIŞMA ─────────────────────────────────
      const sonuc = await worker.execute(
        `[${adim.ad}] ${gorev.baslik}: ${gorev.icerik || gorev.baslik}`
      );

      const sure = Date.now() - t0;

      if (sonuc.durum === 'RED') {
        throw new Error(`Ajan RED: ${sonuc.sonuc}`);
      }

      // Adım başarılı
      gorev.adim_gecmisi.push({
        adim       : adim.ad,
        ajan       : ajanId,
        ajan_ad    : worker.ad,
        durum      : 'TAMAM',
        sure_ms    : sure,
        mod        : sonuc.mod,
        job_id     : sonuc.job_id,
        zaman      : new Date().toISOString(),
      });

      gorev.sonuclar[adim.ad] = {
        ajan    : ajanId,
        sonuc   : sonuc.sonuc ? sonuc.sonuc.slice(0, 500) : 'OK',
        sure_ms : sure,
        mod     : sonuc.mod,
      };

      gorev.adim++;
      gorev.version++;
      this._istat.dagitilan++;

      this._log(`✅ ${gorev.gorev_id} → ${adim.ad} → ${ajanId} (${worker.ad}) [${sure}ms]`);
      this.emit('adim_tamamlandi', { gorev_id: gorev.gorev_id, adim: adim.ad, ajan: ajanId });

      // Son adımsa tamamla
      if (gorev.adim >= ADIMLAR.length) {
        this._gorevTamamla(gorev);
      } else {
        gorev.durum = GOREV_DURUM.KUYRUKTA; // Sonraki adım kuyruğa
      }

    } catch (err) {
      gorev.retry_sayisi++;
      this._istat.retry++;

      gorev.hata_gecmisi.push({
        adim   : adim.ad,
        ajan   : ajanId,
        hata   : err.message,
        retry  : gorev.retry_sayisi,
        zaman  : new Date().toISOString(),
      });

      this._log(`❌ ${gorev.gorev_id} ${adim.ad} HATA: ${err.message} (retry: ${gorev.retry_sayisi})`, 'ERROR');

      if (gorev.retry_sayisi >= AYARLAR.MAX_RETRY) {
        gorev.durum = GOREV_DURUM.HATA;
        this._istat.hata++;
        this._gorevGecmiseEkle(gorev);
        this.emit('gorev_hata', { gorev_id: gorev.gorev_id, hata: err.message });
      } else {
        // Aynı adımda yeniden dene (ilerleme korunur!)
        gorev.durum = GOREV_DURUM.KUYRUKTA;
      }
    } finally {
      gorev.locked = false;
    }
  }

  /**
   * Görevi tamamlandı olarak işaretle.
   */
  _gorevTamamla(gorev) {
    gorev.durum = GOREV_DURUM.TAMAMLANDI;
    gorev.tamamlanma = new Date().toISOString();

    // Toplam süre hesapla
    const toplam_sure = gorev.adim_gecmisi.reduce((a, g) => a + (g.sure_ms || 0), 0);
    gorev.toplam_sure_ms = toplam_sure;

    this._istat.tamamlanan++;
    this._istat._toplam_sure += toplam_sure;
    this._istat.ortalama_sure_ms = Math.round(this._istat._toplam_sure / this._istat.tamamlanan);

    this._log(`🏁 ${gorev.gorev_id} TAMAMLANDI — 5 adım ${toplam_sure}ms`);
    this.emit('gorev_tamamlandi', { gorev_id: gorev.gorev_id, sure_ms: toplam_sure });

    this._gorevGecmiseEkle(gorev);
  }

  /**
   * Tamamlanan/hatalı görevi geçmişe taşı.
   */
  _gorevGecmiseEkle(gorev) {
    this._gecmis.push({ ...gorev });
    if (this._gecmis.length > AYARLAR.GECMIS_LIMIT) {
      this._gecmis.splice(0, this._gecmis.length - AYARLAR.GECMIS_LIMIT);
    }
    this._kuyruk.delete(gorev.gorev_id);
  }

  // ══════════════════════════════════════════════════════════════
  // 3. BAŞLAT / DURDUR
  // ══════════════════════════════════════════════════════════════

  /**
   * Dağıtım döngüsünü başlatır.
   */
  baslat() {
    if (this._calisiyor) {
      this._log('Zaten çalışıyor');
      return;
    }
    this._calisiyor = true;
    this._timer = setInterval(() => this._dispatch(), AYARLAR.DISPATCH_ARALIK_MS);
    this._log(`═══ DAĞITIM MOTORU BAŞLADI — ${AYARLAR.DISPATCH_ARALIK_MS}ms aralık ═══`);
    this.emit('motor_basladi');
  }

  /**
   * Dağıtım döngüsünü durdurur.
   */
  durdur() {
    if (!this._calisiyor) return;
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
    this._calisiyor = false;

    // Kilitli görevleri serbest bırak
    for (const [, gorev] of this._kuyruk) {
      if (gorev.locked) gorev.locked = false;
    }

    this._log('═══ DAĞITIM MOTORU DURDU ═══');
    this.emit('motor_durdu');
  }

  // ══════════════════════════════════════════════════════════════
  // 4. SORGULAR
  // ══════════════════════════════════════════════════════════════

  /**
   * Kuyruk durumunu döndürür.
   */
  kuyrukDurumu() {
    const gorevler = Array.from(this._kuyruk.values());
    return {
      toplam      : gorevler.length,
      kuyrukta    : gorevler.filter(g => g.durum === GOREV_DURUM.KUYRUKTA).length,
      calisiyor   : gorevler.filter(g => [GOREV_DURUM.PLANLANIYOR, GOREV_DURUM.DOGRULANYOR, GOREV_DURUM.CALISIYOR, GOREV_DURUM.DENETLENIYOR, GOREV_DURUM.ONAYLANIYOR].includes(g.durum)).length,
      hata        : gorevler.filter(g => g.durum === GOREV_DURUM.HATA).length,
      gorevler    : gorevler.map(g => ({
        gorev_id  : g.gorev_id,
        baslik    : g.baslik,
        durum     : g.durum,
        adim      : g.adim,
        adim_adi  : g.adim < ADIMLAR.length ? ADIMLAR[g.adim].ad : 'TAMAMLANDI',
        icra_ajan : g.icra_ajan,
        oncelik   : g.oncelik,
        retry     : g.retry_sayisi,
      })),
    };
  }

  /**
   * Tamamlanan görev geçmişi.
   */
  gecmis(limit = 20) {
    return this._gecmis.slice(-limit).reverse();
  }

  /**
   * Belirli bir görevin detayı.
   */
  gorevDetay(gorevId) {
    return this._kuyruk.get(gorevId) || this._gecmis.find(g => g.gorev_id === gorevId) || null;
  }

  /**
   * Ajan havuz durumu.
   */
  havuzDurumu() {
    return this._pool.istatistikler();
  }

  /**
   * Tam durum raporu.
   */
  durumRaporu() {
    return {
      calisiyor      : this._calisiyor,
      kuyruk         : this.kuyrukDurumu(),
      gecmis_sayisi  : this._gecmis.length,
      istatistik     : { ...this._istat },
      havuz          : this._pool.istatistikler(),
      adimlar        : ADIMLAR.map(a => ({ ad: a.ad, ajan: a.varsayilan_ajan, aciklama: a.aciklama })),
      ayarlar        : {
        kuyruk_limit  : AYARLAR.KUYRUK_LIMIT,
        max_retry     : AYARLAR.MAX_RETRY,
        aralik_ms     : AYARLAR.DISPATCH_ARALIK_MS,
      },
      zaman          : new Date().toISOString(),
    };
  }

  // ── LOG ────────────────────────────────────────────────────
  _log(msg, level = 'INFO') {
    const ts = new Date().toISOString().slice(11, 23);
    const icon = level === 'ERROR' ? '❌' : level === 'WARN' ? '⚠️' : 'ℹ️';
    console.log(`${AYARLAR.LOG_PREFIX} ${ts} ${icon} ${msg}`);
  }
}


// ── SINGLETON + EXPORTS ──────────────────────────────────────
const dispatcher = new DagitimMotoru();

module.exports = dispatcher;
module.exports.DagitimMotoru = DagitimMotoru;
module.exports.GOREV_DURUM = GOREV_DURUM;
module.exports.ADIMLAR = ADIMLAR;
module.exports.AYARLAR = AYARLAR;
