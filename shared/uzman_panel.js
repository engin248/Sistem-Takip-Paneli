// ============================================================
// shared/uzman_panel.js
// UZMAN PANEL KARAR SİSTEMİ
// ============================================================
// Her görev/konu için ilgili DOMAIN uzmanları tespit edilir.
// Her uzman SADECE KENDİ ALANINI değerlendirir.
// Kaç domain ilgiliyse o kadar uzman oy kullanır.
// Hiçbir uzman başkasının yerine karar veremez.
//
// HermAI ENTEGRASYONU (Sadi Evren Şeker, YBS Ansiklopedi 2025):
//   Tüm AI çağrıları aiOrchestrator.chat() üzerinden → HermAI Üfuk otomatik enjekte
//   Uzman karar formatı HermAI İlke 2 (MİKRO açıklama) zorunluluğu taşır
// KURAL:
//   - Uzman kendi alanı dışında KONUŞAMAZ
//   - Her uzmanın kararı bağımsız kayıt altına alınır
//   - Toplam onay = ağırlıklı ortalama (uzmanlık skoru × alan ağırlığı)
//   - Eşik altı → RED, Eşik üstü → ONAY, Kritik itiraz → İNSAN_ONAYI
// ============================================================

'use strict';

const AI = require('./aiOrchestrator');
const { hermAiTekKarar } = require('./hermai_mimarisi');
const { TAM_KADRO, TAKIM_KODLARI } = require('../Agent_Uretim_Departmani/roster/index.js');

// ── 15 UZMAN DOMAIN (kapsayıcı alan tanımları) ───────────────
const UZMAN_DOMAINLER = Object.freeze({
  TEKNIK:        { ad: 'Teknik Mimari',       takim: 'MT', agirlik: 1.5, alan: 'Kod, altyapı, mimari kararlar' },
  GUVENLIK:      { ad: 'Güvenlik',            takim: 'GT', agirlik: 2.0, alan: 'Risk, zafiyet, güvenlik açığı' },
  VERI:          { ad: 'Veri ve Veritabanı',  takim: 'VM', agirlik: 1.3, alan: 'DB tasarımı, veri modeli, migrasyon' },
  API:           { ad: 'API ve Entegrasyon',  takim: 'AP', agirlik: 1.2, alan: 'Servis entegrasyonu, API tasarımı' },
  UX:            { ad: 'Kullanıcı Deneyimi',  takim: 'UX', agirlik: 1.0, alan: 'Arayüz, erişilebilirlik, UX' },
  PERFORMANS:    { ad: 'Performans',          takim: 'PO', agirlik: 1.3, alan: 'Hız, ölçeklenebilirlik, optimizasyon' },
  TEST:          { ad: 'Test ve Kalite',      takim: 'TE', agirlik: 1.2, alan: 'Test stratejisi, kalite kapıları' },
  DEPLOY:        { ad: 'Deployment',          takim: 'DO', agirlik: 1.2, alan: 'Dağıtım, CI/CD, konteyner' },
  HUKUK:         { ad: 'Etik ve Hukuk',       takim: 'HU', agirlik: 2.0, alan: 'KVKK, lisans, etik uyum' },
  RISK:          { ad: 'Risk Analizi',        takim: 'RA', agirlik: 1.8, alan: 'Operasyonel risk, iş sürekliliği' },
  IZLEME:        { ad: 'İzleme ve Alarm',     takim: 'SY', agirlik: 1.1, alan: 'Log, metrik, alarm sistemi' },
  MALIYET:       { ad: 'Maliyet ve Bütçe',    takim: 'MK', agirlik: 1.4, alan: 'Kaynak, maliyet, ROI' },
  ZAMAN:         { ad: 'Zaman ve Takvim',     takim: 'OP', agirlik: 1.0, alan: 'Timeline, milestone, bağımlılıklar' },
  EGITIM:        { ad: 'Eğitim ve Dokümant.', takim: 'EN', agirlik: 0.8, alan: 'Kullanım kılavuzu, eğitim planı' },
  STRATEJI:      { ad: 'Strateji ve Vizyon',  takim: 'GA', agirlik: 1.5, alan: 'Uzun vadeli etki, stratejik uyum' },
});

// ── DOMAIN TESPİTİ (görev içeriğine göre) ───────────────────
function domainTespit(icerik) {
  const l = (icerik || '').toLowerCase();
  const aktif = {};

  if (['mimari','teknik','altyapı','sunucu','node','python','api'].some(k => l.includes(k)))       aktif.TEKNIK     = UZMAN_DOMAINLER.TEKNIK;
  if (['güvenlik','hack','zafiyet','şifre','token','auth','yetki'].some(k => l.includes(k)))       aktif.GUVENLIK   = UZMAN_DOMAINLER.GUVENLIK;
  if (['veritabanı','tablo','sql','migration','supabase','db'].some(k => l.includes(k)))           aktif.VERI       = UZMAN_DOMAINLER.VERI;
  if (['api','endpoint','servis','entegrasyon','webhook'].some(k => l.includes(k)))               aktif.API        = UZMAN_DOMAINLER.API;
  if (['arayüz','ui','ux','kullanıcı','panel','tasarım'].some(k => l.includes(k)))                aktif.UX         = UZMAN_DOMAINLER.UX;
  if (['performans','hız','yavaş','optimize','ölçek'].some(k => l.includes(k)))                   aktif.PERFORMANS = UZMAN_DOMAINLER.PERFORMANS;
  if (['test','doğrula','kalite','hata','bug'].some(k => l.includes(k)))                          aktif.TEST       = UZMAN_DOMAINLER.TEST;
  if (['deploy','yayınla','docker','kubernetes','pipeline'].some(k => l.includes(k)))             aktif.DEPLOY     = UZMAN_DOMAINLER.DEPLOY;
  if (['hukuk','kvkk','gizlilik','etik','lisans','yasal'].some(k => l.includes(k)))               aktif.HUKUK      = UZMAN_DOMAINLER.HUKUK;
  if (['risk','tehlike','başarısızlık','kriz','kritik'].some(k => l.includes(k)))                 aktif.RISK       = UZMAN_DOMAINLER.RISK;
  if (['log','izle','alarm','metrik','monitor'].some(k => l.includes(k)))                         aktif.IZLEME     = UZMAN_DOMAINLER.IZLEME;
  if (['maliyet','bütçe','para','kaynak','roi','yatırım'].some(k => l.includes(k)))               aktif.MALIYET    = UZMAN_DOMAINLER.MALIYET;
  if (['süre','takvim','zaman','deadline','milestone'].some(k => l.includes(k)))                  aktif.ZAMAN      = UZMAN_DOMAINLER.ZAMAN;
  if (['eğitim','dokümantasyon','kılavuz','öğren'].some(k => l.includes(k)))                      aktif.EGITIM     = UZMAN_DOMAINLER.EGITIM;
  if (['strateji','vizyon','uzun vade','hedef','plan'].some(k => l.includes(k)))                  aktif.STRATEJI   = UZMAN_DOMAINLER.STRATEJI;

  // En az STRATEJİ ve RİSK her görevde zorunlu
  if (!aktif.STRATEJI) aktif.STRATEJI = UZMAN_DOMAINLER.STRATEJI;
  if (!aktif.RISK)     aktif.RISK     = UZMAN_DOMAINLER.RISK;

  return aktif;
}

// ── TEK UZMAN KARARI ─────────────────────────────────────────
async function uzmanKarariAl(domainKey, domain, konu, gorevDetay, log) {
  const ajan = TAM_KADRO.find(a => a.takim_kodu === domain.takim && a.id.endsWith('-01'))
    || TAM_KADRO.find(a => a.takim_kodu === domain.takim)
    || { kod_adi: `${domain.ad} Uzmanı`, gorev_tanimi: domain.alan };

  const sistem = `Sen "${domain.ad}" uzmanısın.
SINIR: Sadece "${domain.alan}" konusunda karar verirsin.
BAŞKA ALANDA KONUŞAMAZSIN. Alanın dışındaysa "KAPSAM_DISI" de.
EDK-25 Kural 3.9: Görev dışına sapma yasak.

Değerlendirme formatı:
{
  "domain": "${domainKey}",
  "karar": "ONAY/RED/KOSULLU/KAPSAM_DISI",
  "puan": 0-100,
  "alan_uyumu": "Bu görev ${domain.alan} ile nasıl ilgili?",
  "gerekce": "Neden bu karar?",
  "kosullar": ["Onay için şart..."],
  "risk_notu": "Bu alandan gördüğüm risk...",
  "kririk_itiraz": false
}`;

  try {
    const r = await AI.chat(
      `GÖREV: "${konu}"\nDETAY: ${(gorevDetay || '').substring(0, 300)}`,
      sistem, { temperature: 0.1 }
    );
    const veri = JSON.parse((r.content || r).match(/\{[\s\S]*\}/)?.[0] || 'null');
    if (!veri) throw new Error('JSON parse başarısız');
    log(`  [${domainKey.padEnd(10)}] ${veri.karar.padEnd(12)} | Puan: ${veri.puan}/100 | ${veri.gerekce?.substring(0, 60)}`);
    return { ...veri, domain_meta: domain, ajan_id: ajan.id || domain.takim };
  } catch (e) {
    log(`  [${domainKey.padEnd(10)}] HATA: ${e.message}`, 'WARN');
    return { domain: domainKey, karar: 'HATA', puan: 0, gerekce: e.message, domain_meta: domain, kririk_itiraz: false };
  }
}

// ── UZMAN PANEL ANA MOTORU ───────────────────────────────────
/**
 * Görevi ilgili tüm domain uzmanlarına gönderir.
 * Her uzman kendi alanında bağımsız karar verir.
 * Ağırlıklı ortalama hesaplanır.
 */
async function uzmanPanelKarari(konu, gorevDetay, supabase, log) {
  const baslangic = Date.now();
  log(`\n${'═'.repeat(60)}`);
  log(`UZMAN PANEL — "${konu.substring(0, 60)}"`);

  // İlgili domainler tespit et
  const aktifDomainler = domainTespit(konu + ' ' + (gorevDetay || ''));
  const domainSayisi   = Object.keys(aktifDomainler).length;
  log(`Aktif uzman alanı: ${domainSayisi} domain → ${Object.keys(aktifDomainler).join(' | ')}`);
  log(`${'─'.repeat(60)}`);

  // Her uzman paralel karar verir (birbirini beklemiyor)
  const kararPromisleri = Object.entries(aktifDomainler).map(([key, domain]) =>
    uzmanKarariAl(key, domain, konu, gorevDetay, log)
  );
  const kararlar = await Promise.all(kararPromisleri);

  // ── AĞIRLIKLI HESAP ──────────────────────────────────────
  let toplamAgirlik    = 0;
  let agirlikliPuan    = 0;
  let redSayisi        = 0;
  let kritikItiraz     = false;
  let kapsamDisi       = 0;

  for (const k of kararlar) {
    if (k.karar === 'KAPSAM_DISI' || k.karar === 'HATA') { kapsamDisi++; continue; }
    const ag = k.domain_meta?.agirlik || 1.0;
    toplamAgirlik += ag;
    agirlikliPuan += (k.puan || 0) * ag;
    if (k.karar === 'RED')       redSayisi++;
    if (k.kririk_itiraz === true) kritikItiraz = true;
  }

  const netPuan     = toplamAgirlik > 0 ? Math.round(agirlikliPuan / toplamAgirlik) : 0;
  const onaylayanSayisi = kararlar.filter(k => k.karar === 'ONAY' || k.karar === 'KOSULLU').length;

  // ── FİNAL KARAR ──────────────────────────────────────────
  let finalKarar;
  let finalNeden;

  if (kritikItiraz) {
    finalKarar = 'INSAN_ONAYI_GEREKLI';
    finalNeden = 'Kritik itiraz: İnsan değerlendirmesi zorunlu (EDK-25.19)';
  } else if (redSayisi >= 2) {
    finalKarar = 'RED';
    finalNeden = `${redSayisi} uzman reddetti`;
  } else if (netPuan >= 75) {
    finalKarar = 'ONAY';
    finalNeden = `Net puan ${netPuan}/100 — eşik aşıldı`;
  } else if (netPuan >= 50) {
    finalKarar = 'KOSULLU_ONAY';
    finalNeden = `Net puan ${netPuan}/100 — koşullarla devam`;
  } else {
    finalKarar = 'RED';
    finalNeden = `Net puan ${netPuan}/100 — eşik altı`;
  }

  const rapor = {
    konu,
    domain_sayisi:    domainSayisi,
    aktif_domainler:  Object.keys(aktifDomainler),
    kararlar,
    onaylayan:        onaylayanSayisi,
    reddeden:         redSayisi,
    kritik_itiraz:    kritikItiraz,
    net_puan:         netPuan,
    final_karar:      finalKarar,
    final_neden:      finalNeden,
    sure_ms:          Date.now() - baslangic,
  };

  log(`${'─'.repeat(60)}`);
  log(`PANEL SONUÇ: ${finalKarar} | Net: ${netPuan}/100 | Onay: ${onaylayanSayisi}/${domainSayisi - kapsamDisi}`);
  log(`Neden: ${finalNeden}`);
  log(`${'═'.repeat(60)}`);

  return rapor;
}

module.exports = {
  uzmanPanelKarari,
  domainTespit,
  uzmanKarariAl,
  UZMAN_DOMAINLER,
};
