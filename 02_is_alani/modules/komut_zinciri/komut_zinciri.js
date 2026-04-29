// ============================================================
// KOMUT ZİNCİRİ — Panel → GorevKabul → Dispatcher → Ajan → AI
// ============================================================
// Tüm kopuklukları giderir. Tek giriş noktası.
//
// Akış:
//   1. Panel/API komut gönderir
//   2. GorevKabulDepartmani algılar, sentezler
//   3. Onay gelince DagitimMotoru.gorevEkle() çağrılır
//   4. Dispatcher → eslestir → AgentWorker → Ollama/Claude
//   5. Sonuç geri döner
// ============================================================

'use strict';

const { EventEmitter } = require('events');
const path = require('path');
const { GorevKabulDepartmani, KOMUT_DURUM } = require(path.join(__dirname, '../gorev_kabul/gorev_kabul'));
const { DagitimMotoru } = require(path.join(__dirname, '../dispatcher/dispatcher'));

class KomutZinciri extends EventEmitter {
  constructor() {
    super();

    // Departmanları oluştur
    this._kabul = new GorevKabulDepartmani();
    this._dispatcher = new DagitimMotoru();

    // ── Otomatik bağlantılar ─────────────────────────────
    // Onay gelince → Dispatcher'a gönder
    this._kabul.on('komut_onaylandi', (kayit) => {
      this._dispatcherGonder(kayit);
    });

    // Otomatik onay (öğrenilmiş) → Dispatcher'a gönder
    this._kabul.on('komut_otomatik_onay', (kayit) => {
      this._dispatcherGonder(kayit);
    });

    // Dispatcher olaylarını yukarı ilet
    this._dispatcher.on('gorev_eklendi', (e) => this.emit('gorev_eklendi', e));
    this._dispatcher.on('adim_tamamlandi', (e) => this.emit('adim_tamamlandi', e));
    this._dispatcher.on('gorev_tamamlandi', (e) => this.emit('gorev_tamamlandi', e));

    console.log(`[ZINCIR] Komut zinciri kuruldu — Kabul + Dispatcher(${this._dispatcher.havuzDurumu().toplam} ajan)`);
  }

  /**
   * Panel/API'den komut al.
   * @param {{ icerik: string, tip?: string, kaynak?: string, oncelik?: string }} komut
   */
  komutGonder(komut) {
    return this._kabul.komutAl(komut);
  }

  /**
   * Yönetici onayı.
   */
  onayVer(komut_id, onay, duzeltme) {
    return this._kabul.onayVer(komut_id, onay, duzeltme);
  }

  /**
   * Bekleyen onaylar.
   */
  bekleyenler() {
    return this._kabul.bekleyenler();
  }

  /**
   * Onaylanmış komutu Dispatcher'a göndere.
   * @private
   */
  _dispatcherGonder(kayit) {
    const anlasilan = kayit.anlasilan;
    const sonuc = this._dispatcher.gorevEkle({
      baslik: kayit.ham_komut,
      icerik: anlasilan.anlasilan_cumle,
      oncelik: anlasilan.aciliyet === 'KRITIK' ? 'kritik'
             : anlasilan.aciliyet === 'YUKSEK' ? 'yuksek'
             : 'normal',
      meta: {
        komut_id: kayit.komut_id,
        niyet: anlasilan.niyet,
        alan: anlasilan.alan,
        karmasiklik: anlasilan.karmasiklik,
        otomatik: kayit.otomatik || false,
      },
    });

    this.emit('komut_dispatched', {
      komut_id: kayit.komut_id,
      gorev_id: sonuc.gorev_id,
      icra_ajan: sonuc.icra_ajan,
      oncelik: sonuc.oncelik || 'normal',
    });

    return sonuc;
  }

  /**
   * Tek seferlik dispatch (pipeline 1 adım ilerletir).
   */
  async tikla() {
    return this._dispatcher._dispatch();
  }

  /**
   * Otomatik döngüyü başlat.
   */
  baslat() {
    this._dispatcher.baslat();
  }

  /**
   * Otomatik döngüyü durdur.
   */
  durdur() {
    this._dispatcher.durdur();
  }

  /**
   * Görev detayı.
   */
  gorevDetay(gorev_id) {
    return this._dispatcher.gorevDetay(gorev_id);
  }

  /**
   * Kuyruk durumu.
   */
  kuyrukDurumu() {
    return this._dispatcher.kuyrukDurumu();
  }

  /**
   * Birleşik durum raporu.
   */
  durumRaporu() {
    return {
      kabul: this._kabul.durumRaporu(),
      dispatcher: this._dispatcher.durumRaporu(),
      zincir_durumu: 'AKTIF',
    };
  }
}

module.exports = { KomutZinciri };
