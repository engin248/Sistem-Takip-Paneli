/**
 * ai_protokol.js — EDK Protokol Denetçisi
 * Sorumluluk: AI çıktısının 5 filtreden geçirilmesi.
 * Bağımlılık: Yok — saf fonksiyon.
 *
 * MODÜL HATA KODLARI (PRO-xxx — bu modüle özel, çakışma yok):
 *   PRO-001 : Boş/null içerik — yanıt üretilemedi
 *   PRO-002 : Yanıt çok kısa (< 20 karakter) — anlamsız çıktı
 *   PRO-003 : Varsayım kelimesi tespit edildi — D-001 ihlali
 *   PRO-004 : Negatif kısıt kavramı tespit edildi — F-003 ihlali
 *   PRO-005 : Sıfır-mediokrite ifadesi tespit edildi — F-011 ihlali
 *   PRO-006 : Hedef kayması ifadesi tespit edildi — F-001 ihlali
 */

// D-001: Varsayım kelimeleri
const VARSAYIM_KELIMELERI = ['sanırım', 'belki', 'muhtemelen', 'galiba', 'herhalde', 'tahmin ediyorum', 'sanki', 'emin değilim'];

// F-003: Komutan tarafından reddedilen kavramlar
// NOT: 'ortalama' çıkarıldı — temiz metinlerde yanlış pozitif veriyordu.
const NEGATIF_KISIT = ['minimum', 'yeterli', 'yeterince', 'kabul edilebilir', 'makul', 'idare eder', 'en iyi ihtimal', 'optimal olmasa da', 'tatmin edici'];

// F-011: "Yeterli çözüm" ifadeleri
const F011_IFADELER = ['yeterli çözüm', 'en iyi ihtimal', 'yeterli bir', 'kabul edilebilir bir', 'makul bir çözüm', 'büyük ölçüde çalışır'];

// F-001: Hedef kayması ifadeleri
const HEDEF_KAYMASI = ['bunu yapamam', 'bu benim kapsamım dışında', 'belirtilen konuya dönelim'];

/**
 * validateProtocol — AI yanıtını 5 EDK filtresinden geçirir.
 * @param {string} content
 * @returns {{ gecerli: boolean, hata?: string, filtre?: string, kural?: string }}
 */
function validateProtocol(content) {
    if (!content) return { gecerli: false, hata_kodu: 'PRO-001', hata: '[PRO-001] Boş yanıt üretildi.', filtre: 'F-001-HEDEF', kural: 'F-001' };

    const lower = content.toLowerCase();
    const ts    = new Date().toISOString();

    // FİLTRE 1: DOĞRUDANLIK — Boş / çok kısa yanıt
    if (content.trim().length < 20) {
        return { gecerli: false, hata_kodu: 'PRO-002', hata: '[PRO-002] Yanıt çok kısa (min 20 karakter) — anlamsız çıktı.', filtre: 'F1-DOĞRUDANLIK', kural: 'TEK-002', ts };
    }

    // FİLTRE 2: VARSAYIM / TAHMİN — D-001 Hard Lock
    for (const kelime of VARSAYIM_KELIMELERI) {
        if (lower.includes(kelime)) {
            return { gecerli: false, hata_kodu: 'PRO-003', hata: `[PRO-003] Yasaklı varsayım: "${kelime}" — D-001 ihlali.`, filtre: 'F2-VARSAYIM', kural: 'D-001', kelime, ts };
        }
    }

    // FİLTRE 3: NEGATİF KISIT — F-003
    for (const kelime of NEGATIF_KISIT) {
        if (lower.includes(kelime)) {
            return { gecerli: false, hata_kodu: 'PRO-004', hata: `[PRO-004] Reddedilen kavram: "${kelime}" — F-003 ihlali.`, filtre: 'F3-NEGATIF-KISIT', kural: 'F-003', kelime, ts };
        }
    }

    // FİLTRE 4: SIFIR İDARE EDER — F-011
    for (const ifade of F011_IFADELER) {
        if (lower.includes(ifade)) {
            return { gecerli: false, hata_kodu: 'PRO-005', hata: `[PRO-005] "Sıfır İdare Eder" ihlali: "${ifade}" — F-011.`, filtre: 'F4-SIFIR-MEDIOKRITE', kural: 'F-011', ifade, ts };
        }
    }

    // FİLTRE 5: BINARY HEDEF KONTROLÜ — F-001
    for (const ifade of HEDEF_KAYMASI) {
        if (lower.includes(ifade)) {
            return { gecerli: false, hata_kodu: 'PRO-006', hata: `[PRO-006] Hedef kayması: "${ifade}" — F-001 binary kontrol başarısız.`, filtre: 'F5-BINARY-HEDEF', kural: 'F-001', ifade, ts };
        }
    }

    return { gecerli: true, filtreler: 'F1-F2-F3-F4-F5 geçildi', kural_sayisi: 5, ts };
}

module.exports = { validateProtocol, VARSAYIM_KELIMELERI, NEGATIF_KISIT };
