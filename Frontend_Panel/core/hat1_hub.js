// ============================================================
// HAT-1 HUB V3 — Santral Savunması
// ============================================================
// Projesi : Sistem Takip Paneli (STP)
// Görevli : A3
// Konum   : core/hat1_hub.js
// Tarih   : 2026-04-19
//
// GÖREV: Port çakışmalarını engelleyen ve "Hayalet İşlemleri"
//        temizleyen Hub V3'ü optimize eder.
//
// SORUMLULUKLAR:
//   1. PORT YÖNETİMİ: Çakışma tespiti + otomatik alternatif port
//   2. HAYALET TEMİZLİK: Süre aşan/ölü işlemleri tespit ve temizle
//   3. MESAJ ROUTER: Mermi (JSON) yönlendirme — kaynak → hedef
//   4. İŞLEM KAYDI: Her hub işlemi izlenebilir log ile kayıt
//   5. SAĞLIK İZLEME: Hub kapasitesi, kuyruk durumu, aktif bağlantılar
//
// BAĞIMLILIKLAR:
//   - core/hat1_connection.js → Bağlantı sağlık kontrolü
//   - ui/planning_ui.js       → Mermi doğrulama
//   - agents/worker_core.js   → Worker havuzu
//
// KULLANIM:
//   const hub = require('./core/hat1_hub');
//   await hub.basla(3001);
//   hub.mermiYonlendir(mermi);
//   hub.hayaletTemizle();
//   hub.durumRaporu();
//   hub.durdur();
// ============================================================

'use strict';

const { EventEmitter } = require('events');
const net = require('net');

// ── YAPILANDIRMA ─────────────────────────────────────────────
const AYARLAR = {
  VARSAYILAN_PORT     : 3001,
  PORT_ARAMA_ARALIK   : 10,         // Çakışmada max 10 port dener
  HAYALET_ESIK_MS     : 60_000,     // 60sn yanıt yoksa hayalet sayılır
  KUYRUK_LIMIT        : 500,        // Max kuyruk boyutu
  TEMIZLIK_ARALIK_MS  : 30_000,     // 30sn'de bir hayalet temizliği
  LOG_PREFIX          : '[HUB-V3]',
  ISLEM_GECMISI_LIMIT : 200,        // Son 200 işlem saklanır
};

// ── İŞLEM DURUMLARI ──────────────────────────────────────────
const ISLEM_DURUM = {
  KUYRUKTA  : 'KUYRUKTA',
  ISLENIYOR : 'ISLENIYOR',
  TAMAMLANDI: 'TAMAMLANDI',
  HATA      : 'HATA',
  HAYALET   : 'HAYALET',    // Süre aşan + yanıt gelmeyen
  TEMIZLENDI: 'TEMIZLENDI', // Hayalet temizliğiyle kaldırılan
};

// ══════════════════════════════════════════════════════════════
// HAT-1 HUB V3
// ══════════════════════════════════════════════════════════════
class Hat1Hub extends EventEmitter {

  constructor() {
    super();
    this._calisiyor = false;
    this._port = null;
    this._baslamaZamani = null;
    this._temizlikTimer = null;

    // Mesaj kuyruğu
    this._kuyruk = [];

    // Aktif işlemler (hayalet tespiti için)
    this._aktifIslemler = new Map();

    // İşlem geçmişi (audit trail)
    this._islemGecmisi = [];

    // İstatistikler
    this._istatistik = {
      toplam_mermi     : 0,
      yonlendirilen    : 0,
      reddedilen       : 0,
      hayalet_temizlenen: 0,
      port_cakisma     : 0,
      hata             : 0,
    };
  }

  // ══════════════════════════════════════════════════════════════
  // 1. PORT YÖNETİMİ — Çakışma Tespiti
  // ══════════════════════════════════════════════════════════════

  /**
   * Port'un kullanılabilir olup olmadığını kontrol eder.
   * @param {number} port
   * @returns {Promise<boolean>}
   */
  _portMusait(port) {
    return new Promise((resolve) => {
      const server = net.createServer();
      server.once('error', () => resolve(false));
      server.once('listening', () => {
        server.close(() => resolve(true));
      });
      server.listen(port, '127.0.0.1');
    });
  }

  /**
   * Müsait port bulur — çakışma varsa alternatif dener.
   * @param {number} baslangicPort
   * @returns {Promise<number>}
   */
  async _musaitPortBul(baslangicPort) {
    for (let i = 0; i < AYARLAR.PORT_ARAMA_ARALIK; i++) {
      const port = baslangicPort + i;
      const musait = await this._portMusait(port);
      if (musait) {
        if (i > 0) {
          this._istatistik.port_cakisma++;
          this._log(`⚠️ Port ${baslangicPort} meşgul → ${port} kullanılıyor`, 'WARN');
          this.emit('port_cakisma', { istenen: baslangicPort, kullanilan: port });
        }
        return port;
      }
    }
    throw new Error(`Müsait port bulunamadı: ${baslangicPort}-${baslangicPort + AYARLAR.PORT_ARAMA_ARALIK - 1} arası dolu`);
  }

  // ══════════════════════════════════════════════════════════════
  // 2. HAYALET TEMİZLİK — Ölü İşlem Tespiti
  // ══════════════════════════════════════════════════════════════

  /**
   * Süre aşan işlemleri tespit edip temizler.
   * @returns {{ temizlenen: number, detay: object[] }}
   */
  hayaletTemizle() {
    const simdi = Date.now();
    const temizlenenler = [];

    for (const [islemId, islem] of this._aktifIslemler.entries()) {
      const gecenSure = simdi - islem.baslangic;

      if (gecenSure > AYARLAR.HAYALET_ESIK_MS) {
        // Hayalet tespit edildi
        islem.durum = ISLEM_DURUM.HAYALET;
        islem.temizlenmeTarihi = new Date().toISOString();
        islem.gecenSure_ms = gecenSure;

        temizlenenler.push({
          islem_id   : islemId,
          kaynak     : islem.kaynak,
          hedef      : islem.hedef,
          gecen_sure : `${Math.round(gecenSure / 1000)}s`,
          tip        : islem.tip || 'BİLİNMİYOR',
        });

        // Geçmişe ekle + aktiflerden kaldır
        this._islemGecmisiEkle(islemId, ISLEM_DURUM.TEMIZLENDI, islem);
        this._aktifIslemler.delete(islemId);
        this._istatistik.hayalet_temizlenen++;
      }
    }

    if (temizlenenler.length > 0) {
      this._log(`🧹 ${temizlenenler.length} hayalet işlem temizlendi`, 'WARN');
      this.emit('hayalet_temizlendi', { temizlenen: temizlenenler.length, detay: temizlenenler });
    }

    return { temizlenen: temizlenenler.length, detay: temizlenenler };
  }

  /**
   * Periyodik hayalet temizliğini başlatır.
   */
  _temizlikBaslat() {
    if (this._temizlikTimer) return;
    this._temizlikTimer = setInterval(() => {
      this.hayaletTemizle();
    }, AYARLAR.TEMIZLIK_ARALIK_MS);
  }

  /**
   * Periyodik hayalet temizliğini durdurur.
   */
  _temizlikDurdur() {
    if (this._temizlikTimer) {
      clearInterval(this._temizlikTimer);
      this._temizlikTimer = null;
    }
  }

  // ══════════════════════════════════════════════════════════════
  // 3. MESAJ ROUTER — Mermi Yönlendirme
  // ══════════════════════════════════════════════════════════════

  /**
   * Gelen mermiyi doğrular, kuyruğa alır ve hedef hatta yönlendirir.
   * @param {object} mermi - JSON mermi
   * @returns {{ basarili: boolean, islem_id: string, durum: string }}
   */
  mermiYonlendir(mermi) {
    this._istatistik.toplam_mermi++;

    // ── Doğrulama ────────────────────────────────────────────
    if (!mermi || typeof mermi !== 'object') {
      this._istatistik.reddedilen++;
      return { basarili: false, islem_id: null, durum: 'RED: Geçersiz mermi formatı' };
    }

    if (!mermi.baslik && !mermi.text) {
      this._istatistik.reddedilen++;
      return { basarili: false, islem_id: null, durum: 'RED: Başlık/text zorunlu' };
    }

    // ── Kuyruk kapasitesi ────────────────────────────────────
    if (this._kuyruk.length >= AYARLAR.KUYRUK_LIMIT) {
      this._istatistik.reddedilen++;
      this._log(`❌ Kuyruk dolu (${AYARLAR.KUYRUK_LIMIT}) — mermi reddedildi`, 'ERROR');
      return { basarili: false, islem_id: null, durum: `RED: Kuyruk dolu (${AYARLAR.KUYRUK_LIMIT})` };
    }

    // ── İşlem kaydı olu türma ────────────────────────────────
    const islemId = `HUB-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const islem = {
      islem_id   : islemId,
      kaynak     : mermi.kaynak || mermi.source || 'BILINMIYOR',
      hedef      : mermi.hedef || mermi.target || 'HAT-1',
      tip        : mermi.tip || 'GENEL',
      oncelik    : mermi.oncelik || 'normal',
      durum      : ISLEM_DURUM.KUYRUKTA,
      baslangic  : Date.now(),
      mermi_id   : mermi.mermi_id || null,
      veri       : mermi,
      zaman      : new Date().toISOString(),
    };

    // Kuyruğa ekle
    this._kuyruk.push(islem);
    this._aktifIslemler.set(islemId, islem);

    // Öncelik sıralaması: kritik → yuksek → normal → dusuk
    const oncelikPuan = { kritik: 4, yuksek: 3, normal: 2, dusuk: 1 };
    this._kuyruk.sort((a, b) => (oncelikPuan[b.oncelik] || 0) - (oncelikPuan[a.oncelik] || 0));

    // ── İşleme al ────────────────────────────────────────────
    islem.durum = ISLEM_DURUM.ISLENIYOR;
    this._istatistik.yonlendirilen++;

    // Hedef yönlendirme (event tabanlı)
    this.emit('mermi_alindi', {
      islem_id  : islemId,
      kaynak    : islem.kaynak,
      hedef     : islem.hedef,
      tip       : islem.tip,
      oncelik   : islem.oncelik,
      mermi_id  : islem.mermi_id,
    });

    // Tamamlandı işaretle
    islem.durum = ISLEM_DURUM.TAMAMLANDI;
    islem.bitis = Date.now();
    islem.sure_ms = islem.bitis - islem.baslangic;

    // Kuyruktan kaldır
    const idx = this._kuyruk.indexOf(islem);
    if (idx > -1) this._kuyruk.splice(idx, 1);
    this._aktifIslemler.delete(islemId);

    // Geçmişe ekle
    this._islemGecmisiEkle(islemId, ISLEM_DURUM.TAMAMLANDI, islem);

    this._log(`📦 ${islemId} → ${islem.hedef} (${islem.tip}, ${islem.sure_ms}ms)`);

    return { basarili: true, islem_id: islemId, durum: ISLEM_DURUM.TAMAMLANDI, sure_ms: islem.sure_ms };
  }

  // ══════════════════════════════════════════════════════════════
  // 4. İŞLEM GEÇMİŞİ — Audit Trail
  // ══════════════════════════════════════════════════════════════

  _islemGecmisiEkle(islemId, durum, detay) {
    this._islemGecmisi.push({
      islem_id : islemId,
      durum,
      zaman    : new Date().toISOString(),
      kaynak   : detay.kaynak,
      hedef    : detay.hedef,
      tip      : detay.tip,
      sure_ms  : detay.sure_ms || 0,
    });

    // Limit aşımı kontrolü
    if (this._islemGecmisi.length > AYARLAR.ISLEM_GECMISI_LIMIT) {
      this._islemGecmisi.splice(0, this._islemGecmisi.length - AYARLAR.ISLEM_GECMISI_LIMIT);
    }
  }

  /**
   * İşlem geçmişini döndürür.
   * @param {number} limit
   * @returns {object[]}
   */
  islemGecmisi(limit = 50) {
    return this._islemGecmisi.slice(-limit).reverse();
  }

  // ══════════════════════════════════════════════════════════════
  // 5. HUB BAŞLAT / DURDUR
  // ══════════════════════════════════════════════════════════════

  /**
   * Hub'ı başlatır — port kontrol, hayalet temizlik zamanlayıcı.
   * @param {number} port - İstenen port
   */
  async basla(port) {
    if (this._calisiyor) {
      this._log('Zaten çalışıyor — atlanıyor');
      return { port: this._port };
    }

    const hedefPort = port || AYARLAR.VARSAYILAN_PORT;

    try {
      this._port = await this._musaitPortBul(hedefPort);
    } catch (err) {
      this._log(`❌ Port bulunamadı: ${err.message}`, 'ERROR');
      throw err;
    }

    this._calisiyor = true;
    this._baslamaZamani = Date.now();

    // Hayalet temizlik zamanlayıcısını başlat
    this._temizlikBaslat();

    this._log(`═══ HAT-1 HUB V3 Başlatıldı — Port: ${this._port} ═══`);
    this.emit('hub_basladi', { port: this._port });

    return { port: this._port };
  }

  /**
   * Hub'ı durdurur — tüm zamanlayıcıları temizler.
   */
  durdur() {
    if (!this._calisiyor) return;

    this._temizlikDurdur();

    // Kalan aktif işlemleri temizle
    const kalan = this._aktifIslemler.size;
    if (kalan > 0) {
      this._log(`⚠️ ${kalan} aktif işlem durdurularak temizlendi`, 'WARN');
      for (const [id, islem] of this._aktifIslemler.entries()) {
        this._islemGecmisiEkle(id, ISLEM_DURUM.TEMIZLENDI, islem);
      }
      this._aktifIslemler.clear();
    }

    this._calisiyor = false;
    this._log('═══ HAT-1 HUB V3 Durduruldu ═══');
    this.emit('hub_durdu');
  }

  // ══════════════════════════════════════════════════════════════
  // 6. DURUM RAPORU
  // ══════════════════════════════════════════════════════════════

  durumRaporu() {
    return {
      calisiyor       : this._calisiyor,
      port            : this._port,
      uptime_ms       : this._baslamaZamani ? Date.now() - this._baslamaZamani : 0,
      kuyruk_boyutu   : this._kuyruk.length,
      kuyruk_limit    : AYARLAR.KUYRUK_LIMIT,
      aktif_islem     : this._aktifIslemler.size,
      islem_gecmisi   : this._islemGecmisi.length,
      istatistik      : { ...this._istatistik },
      hayalet_esik_ms : AYARLAR.HAYALET_ESIK_MS,
      zaman           : new Date().toISOString(),
    };
  }

  // ── LOG ────────────────────────────────────────────────────
  _log(msg, level = 'INFO') {
    const ts = new Date().toISOString().slice(11, 23);
    const prefix = level === 'ERROR' ? '❌' : level === 'WARN' ? '⚠️' : 'ℹ️';
    console.log(`${AYARLAR.LOG_PREFIX} ${ts} ${prefix} ${msg}`);
  }
}

// ── SINGLETON EXPORT ─────────────────────────────────────────
const hub = new Hat1Hub();

module.exports = hub;
module.exports.Hat1Hub = Hat1Hub;
module.exports.ISLEM_DURUM = ISLEM_DURUM;
module.exports.AYARLAR = AYARLAR;
