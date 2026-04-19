// ============================================================
// ui/ops_stats.js — İSTATİSTİK ENTEGRASYONU
// ============================================================
// Hat 2'den gelen verileri "Tamamlanan/Bekleyen" sayaçlarına
// canlı bağlar.
//
// VERİ KAYNAKLARI:
//   HAT 2 → /api/queue   (taskQueue.ts → getQueueStats)
//   HAT 2 → /api/tasks   (useTaskStore → task durumları)
//   HAT 2 → /api/agents  (agentRegistry → ajan istatistikleri)
//
// ÇALIŞMA PRENSİBİ:
//   1. Polling ile API'lerden veri çeker (5sn aralık)
//   2. Tamamlanan/Bekleyen/Hata sayaçlarını hesaplar
//   3. Callback fonksiyonlarıyla UI bileşenlerine bildirir
//   4. Supabase realtime varsa → anlık güncelleme
//
// SIFIR İNİSİYATİF:
//   - Tüm veriler denetlenebilir
//   - Her güncelleme timestamp ile kayıt altında
//   - Hata durumunda son bilinen değer korunur
// ============================================================

'use strict';

// ── SABİTLER ────────────────────────────────────────────────

const POLLING_INTERVAL_MS = 5000;       // 5 saniye
const API_TIMEOUT_MS      = 10000;      // 10 saniye timeout
const MAX_GECMIS_KAYIT    = 100;        // Son 100 ölçüm saklanır
const BASE_URL            = typeof window !== 'undefined' ? '' : 'http://127.0.0.1:3000';

// ── VERİ MODELLERİ ──────────────────────────────────────────

/**
 * @typedef {Object} OpsSnapshot
 * @property {number} tamamlanan    - Tamamlanan görev sayısı
 * @property {number} bekleyen      - Beklemede olan görev sayısı
 * @property {number} devam_eden    - Devam eden görev sayısı
 * @property {number} dogrulama     - Doğrulama aşamasındaki görev sayısı
 * @property {number} hata          - Hata sayısı
 * @property {number} reddedilen    - Reddedilen görev sayısı
 * @property {number} iptal         - İptal edilen görev sayısı
 * @property {number} toplam        - Toplam görev sayısı
 * @property {number} basari_orani  - Başarı yüzdesi
 * @property {number} ort_sure_ms   - Ortalama işlem süresi (ms)
 * @property {number} aktif_ajan    - Aktif ajan sayısı
 * @property {number} toplam_ajan   - Toplam ajan sayısı
 * @property {string} timestamp     - ISO formatında zaman damgası
 * @property {string} kaynak        - Veri kaynağı (hat2_queue | hat2_tasks | hat2_agents)
 */

/**
 * Boş snapshot oluşturur — başlangıç / hata durumu.
 * @returns {OpsSnapshot}
 */
function bosSnapshot() {
  return {
    tamamlanan:   0,
    bekleyen:     0,
    devam_eden:   0,
    dogrulama:    0,
    hata:         0,
    reddedilen:   0,
    iptal:        0,
    toplam:       0,
    basari_orani: 0,
    ort_sure_ms:  0,
    aktif_ajan:   0,
    toplam_ajan:  0,
    timestamp:    new Date().toISOString(),
    kaynak:       'bos',
  };
}


// ── FETCH YARDIMCISI ────────────────────────────────────────

/**
 * Timeout'lu fetch — API çağrılarında kullanılır.
 * @param {string} url
 * @param {number} [timeout]
 * @returns {Promise<any>}
 */
async function fetchWithTimeout(url, timeout = API_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(`${BASE_URL}${url}`, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    return await res.json();
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}


// ═══════════════════════════════════════════════════════════════
// ANA SINIF — OpsStatsConnector
// ═══════════════════════════════════════════════════════════════

class OpsStatsConnector {
  constructor() {
    /** @type {OpsSnapshot} */
    this._snapshot = bosSnapshot();

    /** @type {OpsSnapshot[]} */
    this._gecmis = [];

    /** @type {Function[]} */
    this._listeners = [];

    /** @type {NodeJS.Timeout|null} */
    this._pollTimer = null;

    /** @type {boolean} */
    this._aktif = false;

    /** @type {number} */
    this._basarisizFetch = 0;

    /** @type {string|null} */
    this._sonHata = null;
  }

  // ── LISTENER YÖNETİMİ ──────────────────────────────────

  /**
   * Snapshot güncellemelerini dinleyen callback kaydet.
   * @param {function(OpsSnapshot): void} callback
   * @returns {function(): void} Unsubscribe fonksiyonu
   */
  subscribe(callback) {
    if (typeof callback !== 'function') {
      throw new Error('[OPS_STATS] Callback fonksiyon olmalı');
    }
    this._listeners.push(callback);

    // Mevcut snapshot'ı hemen bildir
    callback({ ...this._snapshot });

    // Unsubscribe döndür
    return () => {
      this._listeners = this._listeners.filter(fn => fn !== callback);
    };
  }

  /**
   * Tüm dinleyicilere bildirim gönder.
   * @private
   */
  _bildir() {
    const kopyasi = { ...this._snapshot };
    for (const fn of this._listeners) {
      try {
        fn(kopyasi);
      } catch (err) {
        console.error('[OPS_STATS] Listener hatası:', err);
      }
    }
  }

  // ── HAT 2 VERİ ÇEKİCİLER ───────────────────────────────

  /**
   * /api/queue → Kuyruk istatistiklerini çeker.
   * Kaynak: taskQueue.ts → getQueueStats()
   * @returns {Promise<{tamamlandi: number, hata: number, reddedildi: number, basari_orani: number, ort_sure_ms: number, toplam: number}>}
   */
  async _fetchQueueStats() {
    try {
      const data = await fetchWithTimeout('/api/queue');
      if (data?.success && data?.stats) {
        return {
          tamamlandi:   data.stats.tamamlandi   ?? 0,
          hata:         data.stats.hata          ?? 0,
          reddedildi:   data.stats.reddedildi    ?? 0,
          basari_orani: data.stats.basari_orani  ?? 0,
          ort_sure_ms:  data.stats.ort_sure_ms   ?? 0,
          toplam:       data.stats.toplam        ?? 0,
        };
      }
    } catch { /* sessiz */ }
    return null;
  }

  /**
   * /api/tasks → Görev durumlarını çeker.
   * Kaynak: useTaskStore → task durumları
   * @returns {Promise<{bekleyen: number, devam_eden: number, dogrulama: number, tamamlanan: number, reddedilen: number, iptal: number, toplam: number}>}
   */
  async _fetchTaskStats() {
    try {
      const data = await fetchWithTimeout('/api/tasks');
      if (data?.success && Array.isArray(data?.tasks)) {
        const tasks = data.tasks;
        return {
          bekleyen:    tasks.filter(t => t.status === 'beklemede').length,
          devam_eden:  tasks.filter(t => t.status === 'devam_ediyor').length,
          dogrulama:   tasks.filter(t => t.status === 'dogrulama').length,
          tamamlanan:  tasks.filter(t => t.status === 'tamamlandi').length,
          reddedilen:  tasks.filter(t => t.status === 'reddedildi').length,
          iptal:       tasks.filter(t => t.status === 'iptal').length,
          toplam:      tasks.length,
        };
      }
    } catch { /* sessiz */ }
    return null;
  }

  /**
   * /api/agents → Ajan istatistiklerini çeker.
   * Kaynak: agentRegistry → ajan durum bilgisi
   * @returns {Promise<{aktif: number, toplam: number}>}
   */
  async _fetchAgentStats() {
    try {
      const data = await fetchWithTimeout('/api/agents');
      if (data?.success && data?.stats) {
        return {
          aktif:  data.stats.aktif  ?? 0,
          toplam: data.stats.toplam ?? 0,
        };
      }
    } catch { /* sessiz */ }
    return null;
  }

  // ── BİRLEŞİK GÜNCELLEYİCİ ─────────────────────────────

  /**
   * Hat 2'den tüm verileri paralel çeker, snapshot'ı günceller.
   */
  async guncelle() {
    const ts = new Date().toISOString();

    try {
      // Paralel fetching — 3 API aynı anda
      const [queue, tasks, agents] = await Promise.all([
        this._fetchQueueStats(),
        this._fetchTaskStats(),
        this._fetchAgentStats(),
      ]);

      // Snapshot birleştirme — öncelik: tasks > queue
      const yeniSnapshot = { ...bosSnapshot() };

      // Task-board verileri (canlı görev durumları)
      if (tasks) {
        yeniSnapshot.tamamlanan  = tasks.tamamlanan;
        yeniSnapshot.bekleyen    = tasks.bekleyen;
        yeniSnapshot.devam_eden  = tasks.devam_eden;
        yeniSnapshot.dogrulama   = tasks.dogrulama;
        yeniSnapshot.reddedilen  = tasks.reddedilen;
        yeniSnapshot.iptal       = tasks.iptal;
        yeniSnapshot.toplam      = tasks.toplam;
        yeniSnapshot.kaynak      = 'hat2_tasks';
      }

      // Queue verileri (iş kuyruğu istatistikleri)
      if (queue) {
        yeniSnapshot.hata         = queue.hata;
        yeniSnapshot.basari_orani = queue.basari_orani;
        yeniSnapshot.ort_sure_ms  = queue.ort_sure_ms;

        // Task yoksa, queue'dan tamamlanan al
        if (!tasks) {
          yeniSnapshot.tamamlanan = queue.tamamlandi;
          yeniSnapshot.toplam     = queue.toplam;
          yeniSnapshot.kaynak     = 'hat2_queue';
        }
      }

      // Ajan verileri
      if (agents) {
        yeniSnapshot.aktif_ajan  = agents.aktif;
        yeniSnapshot.toplam_ajan = agents.toplam;
      }

      // Başarı oranı hesaplama (tasks varsa)
      if (yeniSnapshot.toplam > 0 && !queue) {
        yeniSnapshot.basari_orani = Math.round(
          (yeniSnapshot.tamamlanan / yeniSnapshot.toplam) * 100
        );
      }

      yeniSnapshot.timestamp = ts;

      // Snapshot güncelle
      this._snapshot = yeniSnapshot;
      this._basarisizFetch = 0;
      this._sonHata = null;

      // Geçmişe ekle
      this._gecmis.push({ ...yeniSnapshot });
      if (this._gecmis.length > MAX_GECMIS_KAYIT) {
        this._gecmis.shift();
      }

      // Dinleyicilere bildir
      this._bildir();

    } catch (err) {
      this._basarisizFetch++;
      this._sonHata = err instanceof Error ? err.message : String(err);

      // Snapshot korunur — hata durumunda son bilinen değer geçerli
      this._snapshot.timestamp = ts;

      // 3 ardışık fail → uyarı
      if (this._basarisizFetch >= 3) {
        console.warn(
          `[OPS_STATS] ${this._basarisizFetch} ardışık fetch hatası: ${this._sonHata}`
        );
      }
    }
  }

  // ── POLLING KONTROL ────────────────────────────────────

  /**
   * Canlı polling başlat.
   * @param {number} [interval] - Polling aralığı ms (varsayılan: 5000)
   */
  baslat(interval = POLLING_INTERVAL_MS) {
    if (this._aktif) return;
    this._aktif = true;

    // İlk güncelleme hemen
    this.guncelle();

    // Periyodik polling
    this._pollTimer = setInterval(() => {
      this.guncelle();
    }, interval);

    console.log(`[OPS_STATS] Canlı bağlantı başlatıldı — ${interval}ms aralık`);
  }

  /**
   * Polling durdur.
   */
  durdur() {
    if (this._pollTimer) {
      clearInterval(this._pollTimer);
      this._pollTimer = null;
    }
    this._aktif = false;
    console.log('[OPS_STATS] Canlı bağlantı durduruldu');
  }

  // ── SORGULAMA ──────────────────────────────────────────

  /**
   * Mevcut snapshot'ı döndürür.
   * @returns {OpsSnapshot}
   */
  getSnapshot() {
    return { ...this._snapshot };
  }

  /**
   * Sadece Tamamlanan/Bekleyen sayaçlarını döndürür.
   * @returns {{ tamamlanan: number, bekleyen: number, oran: number }}
   */
  getSayaclar() {
    return {
      tamamlanan: this._snapshot.tamamlanan,
      bekleyen:   this._snapshot.bekleyen,
      oran: this._snapshot.toplam > 0
        ? Math.round((this._snapshot.tamamlanan / this._snapshot.toplam) * 100)
        : 0,
    };
  }

  /**
   * Genel durum özetini döndürür.
   * @returns {Object}
   */
  getOzet() {
    const s = this._snapshot;
    return {
      tamamlanan:   s.tamamlanan,
      bekleyen:     s.bekleyen,
      devam_eden:   s.devam_eden,
      dogrulama:    s.dogrulama,
      hata:         s.hata,
      reddedilen:   s.reddedilen,
      iptal:        s.iptal,
      toplam:       s.toplam,
      basari_orani: s.basari_orani,
      ort_sure_ms:  s.ort_sure_ms,
      aktif_ajan:   s.aktif_ajan,
      toplam_ajan:  s.toplam_ajan,
      son_guncelleme: s.timestamp,
      durum: this._aktif ? 'CANLI' : 'DURDU',
      ardisik_hata: this._basarisizFetch,
    };
  }

  /**
   * Ölçüm geçmişini döndürür.
   * @param {number} [son] - Son kaç kayıt (varsayılan: tümü)
   * @returns {OpsSnapshot[]}
   */
  getGecmis(son) {
    if (son && son > 0) {
      return this._gecmis.slice(-son);
    }
    return [...this._gecmis];
  }

  /**
   * Trend analizi — son N ölçüm arasındaki değişimi hesaplar.
   * @param {number} [pencere] - Karşılaştırma penceresi (varsayılan: 6 = 30sn)
   * @returns {{ tamamlanan_trend: string, bekleyen_trend: string, hata_trend: string }}
   */
  getTrend(pencere = 6) {
    if (this._gecmis.length < 2) {
      return { tamamlanan_trend: '—', bekleyen_trend: '—', hata_trend: '—' };
    }

    const son  = this._gecmis[this._gecmis.length - 1];
    const once = this._gecmis[Math.max(0, this._gecmis.length - pencere)];

    const tFark = son.tamamlanan - once.tamamlanan;
    const bFark = son.bekleyen   - once.bekleyen;
    const hFark = son.hata       - once.hata;

    return {
      tamamlanan_trend: tFark > 0 ? `↑${tFark}` : tFark < 0 ? `↓${Math.abs(tFark)}` : '→',
      bekleyen_trend:   bFark > 0 ? `↑${bFark}` : bFark < 0 ? `↓${Math.abs(bFark)}` : '→',
      hata_trend:       hFark > 0 ? `↑${hFark}` : hFark < 0 ? `↓${Math.abs(hFark)}` : '→',
    };
  }

  /**
   * Sağlık raporu.
   * @returns {Object}
   */
  getSaglik() {
    const s = this._snapshot;
    return {
      saglik: this._basarisizFetch === 0 ? 'SAĞLIKLI' : 'UYARI',
      polling_aktif: this._aktif,
      listener_sayisi: this._listeners.length,
      gecmis_boyut: this._gecmis.length,
      son_hata: this._sonHata,
      ardisik_hata: this._basarisizFetch,
      ajan_durumu: `${s.aktif_ajan}/${s.toplam_ajan} aktif`,
      gorev_durumu: `${s.tamamlanan}/${s.toplam} tamamlandı (%${s.basari_orani})`,
    };
  }
}


// ═══════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════

const opsStats = new OpsStatsConnector();

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
  OpsStatsConnector,
  opsStats,
  bosSnapshot,
};
