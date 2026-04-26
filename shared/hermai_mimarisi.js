// ============================================================
// shared/hermai_mimarisi.js
// HermAI — Hermenötik Açıklanabilir Yapay Zeka Mimarisi
// ============================================================
// KAYNAK: Prof. Dr. Sadi Evren Şeker
// YBS Ansiklopedi, Cilt 13, Sayı 1, Ocak 2025, Sayfa 42-51
// ============================================================
//
// HermAI'nin 3 TEMEL İLKESİ:
//
//   1. BAĞLAMSAL GERÇEKÇİLİK (Contextual Realism)
//      Karar, içinde bulunduğu bağlamdan ayrılamaz.
//      Her karar "ufuk" (context window) içinde değerlendirilir.
//      → Bu sistemde: Her algoritma karardan önce BAĞLAMI okur.
//
//   2. ÇİFT MODLU AÇIKLAMA (Dual-Mode Explanation)
//      Hermenötik döngü: Parça → Bütün → Parça → Bütün...
//      a) MİKRO açıklama: "Bu kriter neden bu puanı aldı?"
//      b) MAKRO açıklama: "Genel bağlamda bu karar ne anlama geliyor?"
//      → İki katman birbirini tamamlar, çelişirse uyarı verilir.
//
//   3. ERİŞİLEBİLİRLİK (Accessibility)
//      Açıklamalar: araştırmacı/uzman/son kullanıcı düzeyinde.
//      Teknik jargon sadece teknik katmanda. İnsan katmanı sade.
//
// HermAI'nin XAI'dan FARKI:
//   Mevcut XAI: "Hangi özellik ne kadar etkiledi?" (özellik atfı)
//   HermAI    : "Bu karar bu BAĞLAMDA neden anlamlı?" (yorum)
//
// ============================================================
// Bu modül sisteme şunu ekler:
//   her_karar_soru = "Bu karar bu bağlamda neden doğru?"
//   her_karar_cevap = Mikro + Makro açıklama (HermAI döngüsü)
// ============================================================

'use strict';

const AI = require('./aiOrchestrator');
const { edk25CiktiTara } = require('./edk_25');

// ── HermAI BAĞLAM YAPISI (Contextual Realism) ────────────────
function baglamOlustur(gorev, algoritmaSurec, oncekiKararlar = []) {
  return {
    // "Ufuk" — kararın içinde okunduğu anlam çerçevesi
    ufuk: {
      gorev_ozeti:     (gorev.content || gorev.title || '').substring(0, 200),
      departman:       'Planlama_Departmani',
      zaman:           new Date().toISOString(),
      onceki_kararlar: oncekiKararlar.slice(-3), // Son 3 karar bağlamı
      aktif_protokol:  ['EDK-25', 'PDP-44', 'MDS-160'],
    },
    surec: algoritmaSurec,
  };
}

// ── MİKRO AÇIKLAMA (Parça düzeyinde) ─────────────────────────
// "Bu kriter/algoritma neden bu puanı/kararı aldı?"
async function mikroAciklama(algoId, karar, baglamObj) {
  const sistem = `Sen HermAI Mikro Açıklayıcısısın (Sadi Evren Şeker - YBS Ansiklopedi 2025).
HermAI İlke 1 (Bağlamsal Gerçekçilik): Karar bağlamından ayrılamaz.
HermAI İlke 2 (Çift Modlu - MİKRO katman): Sadece bu spesifik kararı açıkla.

SORU: "${algoId}" algoritması neden "${karar.sonuc}" kararını verdi?

FORMAT (kesinlikle bu):
[MİKRO_BAĞLAM]: Bu kararı etkileyen spesifik girdi neydi?
[MİKRO_MANTIK]: Algoritmanın bu girdiyi nasıl işlediği (kural/eşik)?
[MİKRO_SONUÇ]: Bu işlem neden bu sonucu üretti?
[MİKRO_ALTERNATİF]: Hangi koşulda farklı karar çıkardı?`;

  try {
    const r = await AI.chat(
      `Algo: ${algoId} | Karar: ${karar.sonuc} | Puan: ${karar.puan}/100\nNeden: ${karar.neden}\nBağlam: ${JSON.stringify(baglamObj.ufuk).substring(0, 200)}`,
      sistem, { temperature: 0.1 }
    );
    return r.content || r;
  } catch (e) {
    return `[MİKRO HATA]: ${e.message}`;
  }
}

// ── MAKRO AÇIKLAMA (Bütün düzeyinde) ─────────────────────────
// "Bu karar GENEL BAĞLAMDA ne anlama geliyor?"
async function makroAciklama(tumKararlar, baglamObj) {
  const kararOzet = Object.entries(tumKararlar)
    .map(([k, v]) => `${k.toUpperCase()}: ${v.sonuc} (${v.puan}/100)`)
    .join('\n');

  const sistem = `Sen HermAI Makro Açıklayıcısısın (YBS Ansiklopedi 2025).
HermAI İlke 2 (Çift Modlu - MAKRO katman): Tüm kararları bütün olarak yorumla.
HermAI İlke 1 (Ufuk): Bu kararlar "${baglamObj.ufuk.gorev_ozeti.substring(0,80)}" bağlamında ne anlama geliyor?

Hermenötik döngü: Parçalar → Bütün → Anlam
EDK-25: Belirsizliği gizleme. Uydurma yasak.

FORMAT:
[MAKRO_YORUM]: Bu 15 kararın bütünü ne söylüyor?
[BAĞLAMSAL_ANLAM]: Bu sonuç bu bağlamda neden mantıklı/mantıksız?
[RİSK_YORUMU]: Genel tabloda en kritik risk nedir?
[DOĞRU_YOL]: Sistem bu bağlamda ne yapmalı?
[BELİRSİZLİK]: Yorumda emin olunmayan nokta varsa açıkla.`;

  try {
    const r = await AI.chat(
      `TÜM KARARLAR:\n${kararOzet}\n\nBAĞLAM:\n${JSON.stringify(baglamObj.ufuk).substring(0, 300)}`,
      sistem, { temperature: 0.1 }
    );
    return r.content || r;
  } catch (e) {
    return `[MAKRO HATA]: ${e.message}`;
  }
}

// ── HermAI DÖNGÜSÜ: Mikro → Makro → Çelişki Kontrolü ────────
async function hermAiDongusu(tumKararlar, gorev, oncekiKararlar = []) {
  const baglamObj = baglamOlustur(gorev, 'algoritma_pipeline', oncekiKararlar);
  const baslangic = Date.now();

  // Sadece kritik (FAIL/WARN) kararları mikro açıkla — hız optimizasyonu
  const kritikKararlar = Object.entries(tumKararlar)
    .filter(([, v]) => v.sonuc === 'FAIL' || v.sonuc === 'WARN')
    .slice(0, 5); // Max 5 mikro açıklama

  const mikroAciklamalar = {};
  for (const [algoKey, karar] of kritikKararlar) {
    mikroAciklamalar[algoKey] = await mikroAciklama(
      algoKey.toUpperCase().replace('_','-'), karar, baglamObj
    );
  }

  // Makro açıklama — bütün kararları yorumla
  const makroYorum = await makroAciklama(tumKararlar, baglamObj);

  // EDK-25 Dürüstlük Kontrolü — makro yorum gerçekçi mi?
  const edkKontrol = edk25CiktiTara(makroYorum);

  // Mikro-Makro çelişki tespiti
  const celiski = tespit_celiski(mikroAciklamalar, makroYorum);

  return {
    kaynak:          'HermAI — Sadi Evren Şeker, YBS Ansiklopedi Cilt 13, Sayı 1, 2025',
    baglam:          baglamObj.ufuk,
    mikro_aciklamalar: mikroAciklamalar,
    makro_yorum:     makroYorum,
    edk25_kontrol:   edkKontrol,
    celiski:         celiski,
    sure_ms:         Date.now() - baslangic,
    ilkeler_uygulandi: [
      'İlke 1 (Bağlamsal Gerçekçilik): Ufuk bağlamı oluşturuldu',
      'İlke 2 (Çift Mod): Mikro + Makro açıklama üretildi',
      'İlke 3 (Erişilebilirlik): Sade format kullanıldı',
    ],
  };
}

// ── ÇELİŞKİ TESPİTİ ─────────────────────────────────────────
// HermAI döngüsü: Parça ↔ Bütün arasında çelişki varsa uyarı
function tespit_celiski(mikroAciklamalar, makroYorum) {
  // Mikro'da FAIL açıklaması var ama makro "iyi" diyorsa çelişki
  const mikroFailVar = Object.values(mikroAciklamalar).some(m =>
    (m || '').toLowerCase().includes('fail') || (m || '').toLowerCase().includes('red')
  );
  const makroOlumlu = (makroYorum || '').toLowerCase().includes('başarılı') ||
                      (makroYorum || '').toLowerCase().includes('onaylandı');

  if (mikroFailVar && makroOlumlu) {
    return {
      var: true,
      aciklama: 'HermAI Döngüsü UYARI: Mikro (parça) başarısızlık var ama makro (bütün) başarılı gösteriyor. Human review gerekli.',
      seviye: 'KRİTİK',
    };
  }
  return { var: false, aciklama: 'Mikro-Makro tutarlı.', seviye: 'TAMAM' };
}

// ── TEK KARAR HermAI AÇIKLAMASI ─────────────────────────────
// Tekil kullanım için: algoritma_merkezi içinden çağrılır
async function hermAiTekKarar(algoId, karar, gorevIcerik) {
  const baglamObj = baglamOlustur(
    { content: gorevIcerik },
    algoId,
    []
  );
  const mikro = await mikroAciklama(algoId, karar, baglamObj);
  const edkKontrol = edk25CiktiTara(mikro);
  return {
    algo_id:   algoId,
    karar_sonuc: karar.sonuc,
    puan:      karar.puan,
    hermai_mikro: mikro,
    edk25:     edkKontrol,
    ilke:      'HermAI İlke 2 (Mikro Mod) — Sadi Evren Şeker 2025',
  };
}

module.exports = {
  hermAiDongusu,
  hermAiTekKarar,
  baglamOlustur,
  mikroAciklama,
  makroAciklama,
};
