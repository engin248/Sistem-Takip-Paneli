// ============================================================
// agents/Validator.js — BAĞIMSIZ DOĞRULAMA SERVİSİ
// ============================================================
// Gelen görev içeriklerini 3 katmanlı (Teknik/Görev/Kanıt)
// kontrolden geçirir. "Sıfır İnisiyatif" doktrini gereği
// validasyon mantığı Worker ajanlardan soyutlanmıştır.
// ============================================================
'use strict';

class Validator {
  /**
   * Görevi 3 katmandan geçirip karar skorlaması üretir.
   * @param {string} gorev - Gelen ham görev metni
   * @param {string[]} beceriler - Ajanın yetenek matrisi
   * @param {string} katman - Ajanın hiyerarşik katmanı (L1, DESTEK vs.)
   * @param {number} aracSayisi - Ajanın kullanabildiği araç sayısı
   * @param {string} maliyet - Ajanın maliyet sınıfı
   * @returns {{ validasyon: { teknik: string[], gorev: string[], kanit: string[] }, skor: number, karar: string }}
   */
  static validateTask(gorev, beceriler, katman, aracSayisi, maliyet) {
    const validasyon = { teknik: [], gorev: [], kanit: [] };
    let skorToplam = 0;

    // ── KATMAN 1: TEKNİK KONTROL ─────────────────────────────
    if (typeof gorev !== 'string' || gorev.trim().length < 3) {
      validasyon.teknik.push('RED: Görev metni 3 karakterden kısa');
    } else {
      validasyon.teknik.push('OK: Görev metni geçerli');
      skorToplam += 1;
    }

    if (gorev && gorev.length > 5000) {
      validasyon.teknik.push('UYARI: Görev metni 5000 karakteri aşıyor — kırpıldı');
    } else if (gorev && gorev.trim().length >= 3) {
      skorToplam += 1;
    }

    const tehlikeli = /(<script|eval\(|__proto__|constructor\[)/i;
    if (gorev && tehlikeli.test(gorev)) {
      validasyon.teknik.push('RED: Zararlı içerik tespit edildi (Injection Korunması)');
      skorToplam -= 2;
    } else {
      validasyon.teknik.push('OK: İçerik güvenli');
      skorToplam += 1;
    }

    // ── KATMAN 2: GÖREV KONTROL ──────────────────────────────
    const gorevLower = (gorev || '').toLowerCase();
    let beceriEslesme = 0;
    for (const beceri of (beceriler || [])) {
      const kelimeler = beceri.split('_');
      for (const k of kelimeler) {
        if (k.length > 2 && gorevLower.includes(k.toLowerCase())) beceriEslesme++;
      }
    }

    if (beceriEslesme > 0) {
      validasyon.gorev.push(`OK: ${beceriEslesme} beceri eşleşmesi bulundu`);
      skorToplam += Math.min(beceriEslesme, 5);
    } else {
      validasyon.gorev.push('UYARI: Beceri eşleşmesi bulunamadı — görev ajana uygun olmayabilir');
    }

    const kritikAnahtarlar = ['sil', 'kaldır', 'drop', 'delete', 'truncate', 'format'];
    const kritikIcerikVar = kritikAnahtarlar.some(k => gorevLower.includes(k));
    
    if (kritikIcerikVar && (katman === 'DESTEK' || katman === 'OZEL')) {
      validasyon.gorev.push(`RED: ${katman} katmanı yetki sınırı aşıldı (Kritik İşlem Devredilemez)`);
      skorToplam -= 3;
    } else {
      validasyon.gorev.push('OK: Yetki sınırı uygun');
      skorToplam += 1;
    }

    // ── KATMAN 3: KANIT KONTROL ──────────────────────────────
    if (aracSayisi > 0) {
      validasyon.kanit.push(`OK: ${aracSayisi} araç mevcut — kanıt üretimi doğrulanabilir`);
      skorToplam += 1;
    } else {
      validasyon.kanit.push('UYARI: Araç tanımı yok — kanıt üretimi belirsiz/garantisiz');
    }
    validasyon.kanit.push(`Maliyet profili: ${maliyet}`);

    // ── NİHAİ KARAR MEKANİZMASI ──────────────────────────────
    const redTespit = [
      ...validasyon.teknik,
      ...validasyon.gorev,
      ...validasyon.kanit,
    ].some(s => s.startsWith('RED:'));

    const karar = redTespit ? 'REDDEDİLDİ' : (skorToplam >= 3 ? 'ONAYLANDI' : 'KOŞULLU KABUL');

    return { validasyon, skor: skorToplam, karar };
  }
}

module.exports = Validator;
