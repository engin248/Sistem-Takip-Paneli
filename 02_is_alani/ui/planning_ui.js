// ============================================================
// PLANNING UI — Görev Panosu → Hat-1 Mermi Fırlatıcı
// ============================================================
// Projesi : Sistem Takip Paneli (STP)
// Görevli : A1
// Konum   : ui/planning_ui.js
// Tarih   : 2026-04-19
//
// GÖREV: Planlama Departmanı GÖREV PANOSU'ndaki "Ekle" butonunun
//        Hat-1'e mermi (JSON) fırlatmasını sağlar.
//
// MİMARİ:
//   TaskForm.tsx "İŞ EMRİ VER" butonu → /api/tasks POST → Supabase
//   Bu modül aynı akışa ek olarak Hat-1 Hub'a da JSON mermi atar:
//     Buton tık → mermiFirlat() → /api/hub/message POST
//
// MERMİ FORMATI (JSON):
//   {
//     tip       : "GOREV_EMRI",
//     kaynak    : "PLANLAMA_UI",
//     hedef     : "HAT-1",
//     oncelik   : "kritik|yuksek|normal|dusuk",
//     baslik    : "Görev başlığı",
//     aciklama  : "Görev açıklaması",
//     atanan    : "AJAN_KODU",
//     son_tarih : "ISO tarih",
//     operator  : "ENGIN",
//     zaman     : "ISO zaman damgası",
//     mermi_id  : "MRM-xxxx-xxxxx"
//   }
//
// KULLANIM (browser veya Node.js):
//   const planning = require('./ui/planning_ui');
//   const sonuc = await planning.mermiFirlat({ baslik: 'Test', oncelik: 'normal' });
//   console.log(sonuc); // { basarili: true, mermi_id: 'MRM-...', hub_yanit: {...} }
//
// ENTEGRASYON (TaskForm.tsx'e eklenecek satır):
//   import { mermiFirlatBrowser } from '@/../ui/planning_ui';
//   // handleSubmit içinde, API çağrısından sonra:
//   await mermiFirlatBrowser({ baslik, oncelik, aciklama, atanan, sonTarih, operator });
// ============================================================

'use strict';

// ── YAPILANDIRMA ─────────────────────────────────────────────
const AYARLAR = {
  HUB_ENDPOINT : '/api/hub/message',     // Hub mesaj gönderim endpoint'i
  MERMI_TIP    : 'GOREV_EMRI',           // Mermi tipi sabiti
  KAYNAK       : 'PLANLAMA_UI',          // Kaynak tanımlayıcı
  HEDEF        : 'HAT-1',                // Hedef hat
  TIMEOUT_MS   : 10_000,                 // İstek zaman aşımı
  LOG_PREFIX   : '[MERMI]',
};

// ── MERMİ ID ÜRETİCİ ────────────────────────────────────────
function mermiIdUret() {
  const zaman = Date.now().toString(36);
  const rastgele = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `MRM-${zaman}-${rastgele}`;
}

// ── MERMİ OLUŞTUR (Standart JSON Format) ─────────────────────
function mermiOlustur(veri) {
  if (!veri || !veri.baslik || typeof veri.baslik !== 'string' || veri.baslik.trim().length < 3) {
    throw new Error('MERMI_HATA: Başlık zorunlu ve minimum 3 karakter olmalı');
  }

  const gecerliOncelikler = ['kritik', 'yuksek', 'normal', 'dusuk'];
  const oncelik = gecerliOncelikler.includes(veri.oncelik) ? veri.oncelik : 'normal';

  return {
    tip       : AYARLAR.MERMI_TIP,
    kaynak    : AYARLAR.KAYNAK,
    hedef     : AYARLAR.HEDEF,
    oncelik   : oncelik,
    baslik    : veri.baslik.trim(),
    aciklama  : (veri.aciklama || '').trim() || null,
    atanan    : (veri.atanan || 'SISTEM').trim(),
    son_tarih : veri.sonTarih || veri.son_tarih || null,
    operator  : (veri.operator || 'SISTEM').trim(),
    zaman     : new Date().toISOString(),
    mermi_id  : mermiIdUret(),
  };
}

// ── MERMİ FIRLAT (Node.js / Server-side) ─────────────────────
// Hat-1 Hub'a JSON mermi gönderir.
// Node.js ortamı: http modülü kullanır.
// ─────────────────────────────────────────────────────────────
async function mermiFirlat(veri, baseUrl) {
  const mermi = mermiOlustur(veri);

  // Hub payload: source, target, text (JSON stringify)
  const hubPayload = {
    source : mermi.kaynak,
    target : mermi.hedef,
    text   : JSON.stringify(mermi),
  };

  const hedefUrl = (baseUrl || 'http://localhost:3000') + AYARLAR.HUB_ENDPOINT;

  // Node.js ortamı — http/https modülü
  if (typeof window === 'undefined') {
    const isHttps = hedefUrl.startsWith('https');
    const client = isHttps ? require('https') : require('http');

    return new Promise((resolve, reject) => {
      const body = JSON.stringify(hubPayload);
      const url = new URL(hedefUrl);

      const req = client.request({
        hostname : url.hostname,
        port     : url.port || (isHttps ? 443 : 80),
        path     : url.pathname,
        method   : 'POST',
        headers  : {
          'Content-Type'   : 'application/json',
          'Content-Length'  : Buffer.byteLength(body),
        },
        timeout  : AYARLAR.TIMEOUT_MS,
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            log(`✅ Mermi fırlatıldı: ${mermi.mermi_id} → ${mermi.hedef}`);
            resolve({
              basarili  : parsed.success === true,
              mermi_id  : mermi.mermi_id,
              mermi     : mermi,
              hub_yanit : parsed,
            });
          } catch {
            reject(new Error('Hub yanıtı parse edilemedi'));
          }
        });
      });

      req.on('error', (err) => {
        log(`❌ Mermi fırlatma hatası: ${err.message}`, 'ERROR');
        reject(err);
      });
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Hub zaman aşımı'));
      });

      req.write(body);
      req.end();
    });
  }

  // Browser ortamı — fetch API (fallback, ama mermiFirlatBrowser tercih edilmeli)
  return await mermiFirlatBrowser(veri);
}

// ── MERMİ FIRLAT (Browser / Client-side) ─────────────────────
// React bileşenlerinden (TaskForm.tsx) doğrudan çağrılır.
// fetch API kullanır.
// ─────────────────────────────────────────────────────────────
async function mermiFirlatBrowser(veri) {
  const mermi = typeof veri.mermi_id === 'string' ? veri : mermiOlustur(veri);

  const hubPayload = {
    source : mermi.kaynak || AYARLAR.KAYNAK,
    target : mermi.hedef || AYARLAR.HEDEF,
    text   : JSON.stringify(mermi),
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AYARLAR.TIMEOUT_MS);

    const response = await fetch(AYARLAR.HUB_ENDPOINT, {
      method  : 'POST',
      headers : { 'Content-Type': 'application/json' },
      body    : JSON.stringify(hubPayload),
      signal  : controller.signal,
    });

    clearTimeout(timeoutId);
    const data = await response.json();

    if (typeof console !== 'undefined') {
      console.log(`${AYARLAR.LOG_PREFIX} ✅ Mermi fırlatıldı: ${mermi.mermi_id} → ${mermi.hedef}`);
    }

    return {
      basarili  : data.success === true,
      mermi_id  : mermi.mermi_id,
      mermi     : mermi,
      hub_yanit : data,
    };
  } catch (err) {
    if (typeof console !== 'undefined') {
      console.error(`${AYARLAR.LOG_PREFIX} ❌ Mermi fırlatma hatası:`, err);
    }
    return {
      basarili : false,
      mermi_id : mermi.mermi_id,
      mermi    : mermi,
      hata     : err instanceof Error ? err.message : String(err),
    };
  }
}

// ── MERMİ DOĞRULA ────────────────────────────────────────────
// Gelen JSON'un geçerli bir mermi olup olmadığını kontrol eder.
// Hat-1 Hub'dan gelen mesajları doğrulamak için kullanılır.
// ─────────────────────────────────────────────────────────────
function mermiDogrula(json) {
  try {
    const obj = typeof json === 'string' ? JSON.parse(json) : json;

    const kontroller = {
      tip_var      : obj.tip === AYARLAR.MERMI_TIP,
      baslik_var   : typeof obj.baslik === 'string' && obj.baslik.length >= 3,
      mermi_id_var : typeof obj.mermi_id === 'string' && obj.mermi_id.startsWith('MRM-'),
      hedef_var    : typeof obj.hedef === 'string',
      zaman_var    : typeof obj.zaman === 'string',
    };

    const gecerli = Object.values(kontroller).every(v => v === true);

    return {
      gecerli,
      kontroller,
      mermi : gecerli ? obj : null,
    };
  } catch (err) {
    return {
      gecerli    : false,
      kontroller : { parse_hatasi: true },
      mermi      : null,
      hata       : err instanceof Error ? err.message : String(err),
    };
  }
}

// ── DURUM RAPORU ─────────────────────────────────────────────
function durumRaporu() {
  return {
    modul      : 'ui/planning_ui.js',
    gorevli    : 'A1',
    endpoint   : AYARLAR.HUB_ENDPOINT,
    mermi_tip  : AYARLAR.MERMI_TIP,
    kaynak     : AYARLAR.KAYNAK,
    hedef      : AYARLAR.HEDEF,
    timeout_ms : AYARLAR.TIMEOUT_MS,
    zaman      : new Date().toISOString(),
  };
}

// ── LOG ──────────────────────────────────────────────────────
function log(msg, level = 'INFO') {
  const ts = new Date().toISOString().slice(11, 23);
  const prefix = level === 'ERROR' ? '❌' : level === 'WARN' ? '⚠️' : '✅';
  console.log(`${AYARLAR.LOG_PREFIX} ${ts} ${prefix} ${msg}`);
}

// ── EXPORT ───────────────────────────────────────────────────
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    mermiFirlat,
    mermiFirlatBrowser,
    mermiOlustur,
    mermiDogrula,
    mermiIdUret,
    durumRaporu,
    AYARLAR,
  };
}

// Browser global (script tag ile yüklendiğinde)
if (typeof window !== 'undefined') {
  window.PlanningUI = {
    mermiFirlat       : mermiFirlatBrowser,
    mermiOlustur,
    mermiDogrula,
    mermiIdUret,
    durumRaporu,
  };
}
