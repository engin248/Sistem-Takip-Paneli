// ============================================================
// HAT-1 CONNECTION — Hibrit Çekirdek (Integrated Core)
// ============================================================
// Projesi : Sistem Takip Paneli (STP)
// Konum   : core/hat1_connection.js
// Tarih   : 2026-04-19
//
// MİMARİ:
//   ESKİ NİZAM  → basla(), durdur(), durumRaporu(), on()
//                  stp_baslat.js ve UI uyumluluğu korunur
//   YENİ NİZAM  → lpush(), brpop() — Redis/TCP tabanlı
//                  Ajanlar ve Planlama için görev hatları
//
// HATLAR:
//   hat1 → RED_LINE_TASKS  (Görev kuyruğu)
//   hat2 → LOG_LINE        (Log kuyruğu)
//   hat3 → DATA_LINE       (Veri kuyruğu)
// ============================================================

'use strict';

const net = require('net');
const { EventEmitter } = require('events');

// ── GÖZETLEME VE SAĞLIK İZLEME (ESKİ NİZAM KORUMASI) ───────
class ConnectionManager extends EventEmitter {

  constructor() {
    super();
    this._calisiyor = false;
    this._baslamaZamani = null;

    // Hat durumları — stp_baslat.js uyumlu format
    this._hatlar = {
      'HAT-SUPABASE'  : { durum: 'BEKLEMEDE', gecikme_ms: 0, basari: 0, hata: 0, son_kontrol: null },
      'HAT-EXTERNAL'  : { durum: 'BEKLEMEDE', gecikme_ms: 0, basari: 0, hata: 0, son_kontrol: null },
      'HAT-OLLAMA'    : { durum: 'BEKLEMEDE', gecikme_ms: 0, basari: 0, hata: 0, son_kontrol: null },
      'HAT-TELEGRAM'  : { durum: 'BEKLEMEDE', gecikme_ms: 0, basari: 0, hata: 0, son_kontrol: null },
    };

    // TCP hat durumları (lpush/brpop)
    this._tcpHatlar = {
      'RED_LINE_TASKS' : { durum: 'HAZIR', gonderilen: 0, alinan: 0, hata: 0 },
      'LOG_LINE'       : { durum: 'HAZIR', gonderilen: 0, alinan: 0, hata: 0 },
      'DATA_LINE'      : { durum: 'HAZIR', gonderilen: 0, alinan: 0, hata: 0 },
    };

    this._pingTimer = null;
  }

  // ── ESKİ API: basla() ──────────────────────────────────────
  async basla() {
    if (this._calisiyor) return true;

    this._calisiyor = true;
    this._baslamaZamani = Date.now();

    console.log('\x1b[35m[SİSTEM]\x1b[0m Gözetleme modülleri ve Sağlık izleme başlatıldı.');

    // Sağlık kontrollerini başlat
    await this._saglikKontrol();

    // Periyodik ping (30sn)
    this._pingTimer = setInterval(() => this._saglikKontrol(), 30_000);

    this.emit('statusUpdate', this.durumRaporu());
    return true;
  }

  // ── ESKİ API: durdur() ─────────────────────────────────────
  durdur() {
    if (this._pingTimer) {
      clearInterval(this._pingTimer);
      this._pingTimer = null;
    }
    this._calisiyor = false;

    console.log('\x1b[31m[SİSTEM]\x1b[0m Tüm hatlar güvenli şekilde kapatıldı.');
    this.emit('stop');
  }

  // ── ESKİ API: durumRaporu() ────────────────────────────────
  // stp_baslat.js bu formata bağımlı:
  //   { calisiyor, hatlar: { HAT-X: { durum, gecikme_ms } } }
  durumRaporu() {
    return {
      calisiyor : this._calisiyor,
      uptime_ms : this._baslamaZamani ? Date.now() - this._baslamaZamani : 0,
      hatlar    : { ...this._hatlar },
      tcp_hatlar: { ...this._tcpHatlar },
      zaman     : new Date().toISOString(),
    };
  }

  // ── ESKİ API: zorlaReconnect() ─────────────────────────────
  zorlaReconnect(hatId) {
    if (this._hatlar[hatId]) {
      this._hatlar[hatId].durum = 'YENIDEN_BAGLANILIYOR';
      console.log(`\x1b[33m[RECONNECT]\x1b[0m ${hatId} yeniden bağlanıyor...`);
      this._tekHatKontrol(hatId);
    }
  }

  // ── ESKİ API: hatEkle() ────────────────────────────────────
  hatEkle(hatId, pingFn) {
    this._hatlar[hatId] = { durum: 'BEKLEMEDE', gecikme_ms: 0, basari: 0, hata: 0, son_kontrol: null, pingFn };
  }

  // ── SAĞLIK KONTROLÜ ────────────────────────────────────────
  async _saglikKontrol() {
    const kontroller = {
      'HAT-SUPABASE'  : () => this._httpPing(process.env.NEXT_PUBLIC_SUPABASE_URL),
      'HAT-EXTERNAL'  : () => this._httpPing(process.env.NEXT_PUBLIC_SUPABASE_URL_EXTERNAL || process.env.NEXT_PUBLIC_SUPABASE_URL),
      'HAT-OLLAMA'    : () => this._httpPing(process.env.OLLAMA_BASE_URL || 'http://localhost:11434'),
      'HAT-TELEGRAM'  : () => this._telegramPing(),
    };

    for (const [hatId, pingFn] of Object.entries(kontroller)) {
      await this._tekHatKontrol(hatId, pingFn);
    }
  }

  async _tekHatKontrol(hatId, pingFn) {
    const hat = this._hatlar[hatId];
    if (!hat) return;

    const fn = pingFn || hat.pingFn;
    if (!fn) {
      hat.durum = 'DEVRE_DISI';
      hat.gecikme_ms = 0;
      return;
    }

    const start = Date.now();
    try {
      await fn();
      hat.durum = 'BAGLI';
      hat.gecikme_ms = Date.now() - start;
      hat.basari++;
      hat.son_kontrol = new Date().toISOString();
      this.emit('yeniden_baglandi', hatId);
    } catch {
      hat.durum = 'KOPUK';
      hat.gecikme_ms = Date.now() - start;
      hat.hata++;
      hat.son_kontrol = new Date().toISOString();
    }
  }

  _httpPing(url) {
    if (!url) return Promise.reject(new Error('URL yok'));
    const mod = url.startsWith('https') ? require('https') : require('http');
    return new Promise((resolve, reject) => {
      const req = mod.get(url, { timeout: 5000 }, (res) => {
        res.resume();
        resolve(res.statusCode);
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    });
  }

  _telegramPing() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return Promise.reject(new Error('Token yok'));
    return this._httpPing(`https://api.telegram.org/bot${token}/getMe`);
  }

  // ══════════════════════════════════════════════════════════
  // YENİ NİZAM: YÜKSEK HIZLI GÖREV HATLARI (REDIS/TCP)
  // ══════════════════════════════════════════════════════════

  // Protokol Gümrüğü (Hatalı paketleri engeller)
  _validate(type, payload) {
    if (!type || !payload) {
      console.error('\x1b[31m[GÜMRÜK HATA]\x1b[0m Geçersiz paket formatı reddedildi.');
      return false;
    }
    return true;
  }

  // Hatlara veri basma (Push)
  lpush(queue, payload) {
    if (!this._validate(queue, payload)) return;

    const client = net.createConnection(6379, '127.0.0.1', () => {
      const packet = JSON.stringify({
        type      : 'PUSH',
        key       : queue,
        payload,
        timestamp : new Date().toISOString(),
        priority  : 'NORMAL',
      });
      client.write(packet);
      client.end();
    });

    client.on('error', () => {
      // Redis/Hub kapalıysa sessizce hata bas, sistem çökmesin
      if (this._tcpHatlar[queue]) this._tcpHatlar[queue].hata++;
      this.emit('error', `Hat bağlantısı sağlanamadı: ${queue}`);
    });

    client.on('connect', () => {
      if (this._tcpHatlar[queue]) this._tcpHatlar[queue].gonderilen++;
    });
  }

  // Hatlardan veri çekme (Pop — Ajanlar için)
  brpop(queue, timeout, callback) {
    const client = net.createConnection(6379, '127.0.0.1', () => {
      client.write(JSON.stringify({ type: 'POP', key: queue }));
    });

    client.on('data', (data) => {
      try {
        const result = JSON.parse(data.toString());
        if (this._tcpHatlar[queue]) this._tcpHatlar[queue].alinan++;
        callback(null, [queue, result]);
        client.end();
      } catch {
        console.log('\x1b[31m[PROTOKOL HATA]\x1b[0m Bozuk veri temizlendi.');
        client.end();
      }
    });

    client.on('error', () => {
      if (this._tcpHatlar[queue]) this._tcpHatlar[queue].hata++;
      // Bağlantı koparsa 2sn sonra otomatik tekrar dene (Auto-Reconnect)
      setTimeout(() => this.brpop(queue, timeout, callback), 2000);
    });
  }
}

// ── SINGLETON INSTANCE ───────────────────────────────────────
const manager = new ConnectionManager();

// ── EXPORT ───────────────────────────────────────────────────
module.exports = {
  // Eski API Desteği (stp_baslat.js, UI uyumluluğu)
  basla        : () => manager.basla(),
  durdur       : () => manager.durdur(),
  durumRaporu  : () => manager.durumRaporu(),
  zorlaReconnect: (hatId) => manager.zorlaReconnect(hatId),
  hatEkle      : (hatId, fn) => manager.hatEkle(hatId, fn),
  on           : (...args) => manager.on(...args),

  // Yeni Hat Bağlantıları (Ajanlar ve Planlama için)
  hat1: {
    lpush : (q, p) => manager.lpush('RED_LINE_TASKS', p),
    brpop : (q, t, c) => manager.brpop('RED_LINE_TASKS', t, c),
  },
  hat2: {
    lpush : (q, p) => manager.lpush('LOG_LINE', p),
    brpop : (q, t, c) => manager.brpop('LOG_LINE', t, c),
  },
  hat3: {
    lpush : (q, p) => manager.lpush('DATA_LINE', p),
    brpop : (q, t, c) => manager.brpop('DATA_LINE', t, c),
  },

  // Ham erişim gerekirse
  manager,
};
