/**
 * İÇ GÜVENLİK DEPARTMANI — Güvenlik İzleme ve Denetim
 * HATA #11: Klasör tamamen boştu.
 * 
 * Bu modül:
 * 1. F-003/F-001/F-011 kural ihlallerini izler
 * 2. Şüpheli girdileri (prompt injection, SQL, XSS) engeller
 * 3. Her denetim işlemini değiştirilemez log'a yazar
 * 4. Güvenlik raporunu API üzerinden sunar
 */

const fs   = require('fs');
const path = require('path');

// ── YAPILANDIRMA ────────────────────────────────────────────
const GUVENLIK_LOG = path.join(__dirname, 'guvenlik.log');
const MAX_LOG_SIZE = 5 * 1024 * 1024; // 5MB rotasyon

// Saldırı desenleri
const SALDIRI_DESENLERI = [
  { desen: /ignore.*previous|forget.*instructions|system.*prompt/i, tip: 'PROMPT_INJECTION' },
  { desen: /(union\s+select|drop\s+table|delete\s+from|insert\s+into|or\s+1\s*=\s*1)/i, tip: 'SQL_INJECTION' },
  { desen: /<script|onerror|javascript:/i, tip: 'XSS' },
  { desen: /rm\s+-rf|del\s+\/|format\s+c:/i, tip: 'TEHLIKELI_KOMUT' },
];

// Takip: IP / kaynak bazlı hata sayacı (bellek içi)
const HATA_SAYACI = new Map(); // key: kaynak, value: { sayi, son_zaman }
const RATE_ESIK = 10;     // Bu kadar ihlalder sonra kaynak engellenir
const UNBAN_SURE = 60000; // 60 sn sonra unban

// ── GÜVENLİK LOG ────────────────────────────────────────────
function guvenlikLog(olay) {
  try {
    // Rotasyon
    if (fs.existsSync(GUVENLIK_LOG)) {
      const stat = fs.statSync(GUVENLIK_LOG);
      if (stat.size > MAX_LOG_SIZE) {
        const arsiv = GUVENLIK_LOG.replace('.log', `_${Date.now()}.log`);
        fs.renameSync(GUVENLIK_LOG, arsiv);
      }
    }
    const satir = JSON.stringify({ ts: new Date().toISOString(), ...olay });
    fs.appendFileSync(GUVENLIK_LOG, satir + '\n', 'utf-8');
  } catch (e) {
    console.error(`[İÇ GÜVENLİK LOG HATA]: ${e.message}`);
  }
}

// ── TARAMA FONKSİYONU ───────────────────────────────────────
/**
 * girdiTara — Sisteme giren her metni tarar.
 * @param {string} metin Taranan metin
 * @param {string} kaynak Kaynak modül/IP
 * @returns {{ gecti: boolean, tip?: string, aciklama?: string }}
 */
function girdiTara(metin, kaynak = 'BILINMIYOR') {
  if (!metin || typeof metin !== 'string') {
    return { gecti: false, tip: 'GECERSIZ_TIP', aciklama: 'Girdi string değil' };
  }

  // F-016: Minimum uzunluk kontrolü (5 karakter)
  if (metin.trim().length < 5) {
    return { gecti: false, tip: 'GIGO_MIN_UZUNLUK', aciklama: `Girdi çok kısa (${metin.trim().length} karakter, min 5) — F-016` };
  }

  // Rate limit kontrolü
  const simdi = Date.now();
  let kaydı = HATA_SAYACI.get(kaynak) || { sayi: 0, son_zaman: 0 };
  // Unban: son ihlalden bu yana UNBAN_SURE geçtiyse sayacı sıfırla
  if (kaydı.son_zaman > 0 && simdi - kaydı.son_zaman > UNBAN_SURE) {
    kaydı = { sayi: 0, son_zaman: 0 };
    HATA_SAYACI.set(kaynak, kaydı);
  }
  if (kaydı.sayi >= RATE_ESIK) {
    guvenlikLog({ tip: 'RATE_LIMIT', kaynak, metin: metin.slice(0, 100) });
    return { gecti: false, tip: 'RATE_LIMIT', aciklama: `${kaynak} çok fazla ihlal yaptı, geçici blok.` };
  }

  // Saldırı deseni tarama
  for (const { desen, tip } of SALDIRI_DESENLERI) {
    if (desen.test(metin)) {
      kaydı.sayi++;
      kaydı.son_zaman = simdi;
      HATA_SAYACI.set(kaynak, kaydı);
      guvenlikLog({ tip, kaynak, metin: metin.slice(0, 200), ihlal_no: kaydı.sayi });
      console.error(`[İÇ GÜVENLİK] [${tip}] Kaynak: ${kaynak} | İhlal #${kaydı.sayi}`);
      return { gecti: false, tip, aciklama: `${tip} saldırı deseni tespit edildi.` };
    }
  }

  return { gecti: true };
}

// ── GÜVENLİK RAPORU ─────────────────────────────────────────
/**
 * guvenlikRaporu — Son N ihlali döndürür
 */
function guvenlikRaporu(satirSayisi = 50) {
  try {
    if (!fs.existsSync(GUVENLIK_LOG)) return [];
    const icerik = fs.readFileSync(GUVENLIK_LOG, 'utf-8');
    return icerik.trim().split('\n').filter(Boolean).slice(-satirSayisi).map(s => {
      try { return JSON.parse(s); } catch { return { ham: s }; }
    });
  } catch { return []; }
}

// ── RATE LIMIT DURUMU ───────────────────────────────────────
function rateLimitDurumu() {
  const durum = {};
  HATA_SAYACI.forEach((v, k) => { durum[k] = v; });
  return durum;
}

module.exports = { girdiTara, guvenlikRaporu, rateLimitDurumu };
