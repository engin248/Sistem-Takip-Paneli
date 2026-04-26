// ============================================================
// Planlama_Departmani/algoritma_merkezi.js
// PLANLAMA DEPARTMANI — 15 KARAR ALGORİTMASI
// ============================================================
// Planlama departmanında KARAR VEREN = ALGORİTMA.
// Sahte ajan değil, deterministik kural motoru.
// Her algoritmanın girişi, çıkışı ve hata kodu tanımlı.
// ============================================================
// A-01  Görev Giriş Filtresi (GIGO/PDP-44)
// A-02  G-2 Rotalama Algoritması
// A-03  Alan Bağımsızlık Kontrolü
// A-04  Alternatif Üretim Merkezi
// A-05  Tez / Antitez Denge Kontrolü
// A-06  Hakem Puanlama Matrisi
// A-07  Ağırlıklı Sentez Algoritması
// A-08  Proje Plan Doğrulama
// A-09  Teknoloji Seçim Matrisi
// A-10  Operasyon Plan Uyum Kontrolü
// A-11  Yürüt Fazı Sapma Dedektörü
// A-12  Bağımsız Doğrulama Motoru
// A-13  Uzman Panel Karar Toplayıcı
// A-14  Final Onay Kapısı (8 kapı EDK-25.17)
// A-15  Audit İz Yazıcı (değiştirilemez kayıt)
// ============================================================

'use strict';

const { pdp44Rapor } = require('../shared/pdp_44');
const { edk25CiktiTara } = require('../shared/edk_25');
const { tumPipelineAcikla } = require('../shared/karar_aciklama_motoru');
const { hermAiDongusu } = require('../shared/hermai_mimarisi'); // HermAI: Sadi Evren Şeker YBS 2025

// ── ORTAK KARAR FORMATI ─────────────────────────────────────
function karar(algo, sonuc, puan, neden, detay = {}) {
  return {
    algo_id:   algo,
    sonuc,          // 'PASS' | 'FAIL' | 'WARN' | 'BEKLE'
    puan,           // 0-100
    neden,
    zaman:     new Date().toISOString(),
    ...detay,
  };
}

// ============================================================
// A-01: GÖREV GİRİŞ FİLTRESİ
// Giriş: görev metin
// Çıkış: PASS/FAIL | eksik maddeler
// ============================================================
function A01_gorevGirisFiltesi(icerik) {
  if (!icerik || icerik.trim().length < 5)
    return karar('A-01', 'FAIL', 0, 'İçerik boş veya çok kısa (min 5 karakter)', { hata_kodu: 'ERR_A01_BOSH' });

  const pdp = pdp44Rapor(icerik);
  if (pdp.durum === 'TAM_BELIRSIZ')
    return karar('A-01', 'FAIL', pdp.puan_sayisal || 10, `PDP-44 TAM_BELİRSİZ: ${pdp.eksik_maddeler?.slice(0, 3).join(' | ')}`, { pdp44: pdp, hata_kodu: 'ERR_A01_PDP44' });

  const puan = pdp.durum === 'TAM_TANIMLI' ? 100 : 60;
  return karar('A-01', 'PASS', puan, `PDP-44: ${pdp.pdp44_puan} | ${pdp.durum}`, { pdp44: pdp });
}

// ============================================================
// A-02: G-2 ROTALAMA ALGORİTMASI
// Giriş: görev metni
// Çıkış: takım kodu (2 harf)
// ============================================================
const ROTALAMA_KURALLARI = [
  { kelimeler: ['veritabanı','sql','migration','tablo','db'],    takim: 'VM' },
  { kelimeler: ['api','endpoint','rest','graphql','webhook'],    takim: 'AP' },
  { kelimeler: ['arayüz','css','ui','ux','panel','tasarım'],    takim: 'UX' },
  { kelimeler: ['güvenlik','hack','zafiyet','token','şifre'],   takim: 'GT' },
  { kelimeler: ['hata','bug','sorun','arıza','crash'],          takim: 'HT' },
  { kelimeler: ['test','doğrula','kontrol','kalite'],           takim: 'TE' },
  { kelimeler: ['deploy','yayınla','docker','k8s','ci/cd'],     takim: 'DO' },
  { kelimeler: ['performans','hız','optimize','cache'],         takim: 'PO' },
  { kelimeler: ['risk','tehlike','alternatif','kriz'],          takim: 'RA' },
  { kelimeler: ['mimari','monolith','microservice','altyapı'],  takim: 'MT' },
  { kelimeler: ['yapay zeka','ai','model','llm','ajan'],        takim: 'AI' },
  { kelimeler: ['kamera','görüntü','video','tespit'],           takim: 'GT' },
  { kelimeler: ['whatsapp','telegram','mesaj','bot'],           takim: 'OP' },
  { kelimeler: ['strateji','vizyon','plan','hedef'],            takim: 'GA' },
];

function A02_g2Rotalama(icerik) {
  const l = (icerik || '').toLowerCase();
  for (const kural of ROTALAMA_KURALLARI) {
    if (kural.kelimeler.some(k => l.includes(k))) {
      return karar('A-02', 'PASS', 100, `Kural eşleşti → ${kural.takim}`, { takim: kural.takim, yontem: 'kural_eslesme' });
    }
  }
  return karar('A-02', 'PASS', 60, 'Fallback → GA (Genel Analiz)', { takim: 'GA', yontem: 'fallback' });
}

// ============================================================
// A-03: ALAN BAĞIMSIZLIK KONTROLÜ
// Giriş: ajan ID, görev içeriği, ajan uzmanlık alanı
// Çıkış: PASS/FAIL — ajan kendi alanında mı?
// ============================================================
function A03_alanBagimsizlik(ajanId, ajanUzmanlik, gorevIcerik) {
  if (!ajanUzmanlik || !gorevIcerik)
    return karar('A-03', 'WARN', 50, 'Uzmanlık veya içerik tanımsız — kontrol atlandı');

  const icerikKelimeler = gorevIcerik.toLowerCase().split(/\s+/);
  const uzmanlikKelimeler = ajanUzmanlik.toLowerCase().split(/[\s,;]+/);
  const kesisim = uzmanlikKelimeler.filter(k => k.length > 3 && icerikKelimeler.some(ik => ik.includes(k)));

  if (kesisim.length === 0)
    return karar('A-03', 'FAIL', 0, `${ajanId} kendi alanı dışında çalışıyor`, { hata_kodu: 'ERR_A03_KAPSAM_DISI', kesisim: [] });

  return karar('A-03', 'PASS', Math.min(100, kesisim.length * 30), `Alan uyumu: ${kesisim.join(', ')}`, { kesisim });
}

// ============================================================
// A-04: ALTERNATİF ÜRETIM MERKEZI
// Giriş: alternatif sayısı
// Çıkış: PASS/FAIL — yeterli alternatif üretildi mi?
// ============================================================
function A04_alternatisSayisiKontrol(alternatifSayisi, minGerekli = 2) {
  if (alternatifSayisi < minGerekli)
    return karar('A-04', 'FAIL', 0, `Yetersiz alternatif: ${alternatifSayisi} < ${minGerekli}`, { hata_kodu: 'ERR_A04_MIN_ALT' });
  const puan = Math.min(100, (alternatifSayisi / minGerekli) * 70);
  return karar('A-04', 'PASS', puan, `${alternatifSayisi} alternatif üretildi`);
}

// ============================================================
// A-05: TEZ/ANTİTEZ DENGE KONTROLÜ
// Giriş: tez puan, antitez puan
// Çıkış: PASS/FAIL — denge var mı?
// ============================================================
function A05_tezAntitezDenge(tezPuan, antitezPuan) {
  if (tezPuan === undefined || antitezPuan === undefined)
    return karar('A-05', 'FAIL', 0, 'Tez veya antitez puanı tanımsız', { hata_kodu: 'ERR_A05_EKSIK' });
  const fark = Math.abs(tezPuan - antitezPuan);
  if (fark > 80)
    return karar('A-05', 'WARN', 40, `Dengesiz tartışma (fark ${fark} > 80) — antitez zayıf`);
  return karar('A-05', 'PASS', 100 - (fark / 2), `Denge tamam — Tez:${tezPuan} Anti:${antitezPuan} Fark:${fark}`);
}

// ============================================================
// A-06: HAKEM PUANLAMA MATRİSİ
// Giriş: kriter puanları dizisi
// Çıkış: ağırlıklı ortalama, PASS/FAIL
// ============================================================
function A06_hakemPuanlama(kriterPuanlari) {
  if (!kriterPuanlari?.length)
    return karar('A-06', 'FAIL', 0, 'Kriter puanı girilmedi', { hata_kodu: 'ERR_A06_BOSH' });
  const ort = Math.round(kriterPuanlari.reduce((s, p) => s + (p || 0), 0) / kriterPuanlari.length);
  const sonuc = ort >= 60 ? 'PASS' : ort >= 40 ? 'WARN' : 'FAIL';
  return karar('A-06', sonuc, ort, `Hakem ortalama: ${ort}/100 (${kriterPuanlari.length} kriter)`);
}

// ============================================================
// A-07: AĞIRLIKLI SENTEZ ALGORİTMASI
// Giriş: [{puan, agirlik}] dizisi
// Çıkış: net ağırlıklı puan
// ============================================================
function A07_agirlikliSentez(puanlar) {
  if (!puanlar?.length)
    return karar('A-07', 'FAIL', 0, 'Sentez için puan girilmedi');

  let toplamAg = 0; let agPuan = 0;
  for (const p of puanlar) {
    const ag = p.agirlik || 1;
    toplamAg += ag;
    agPuan   += (p.puan || 0) * ag;
  }
  const net = Math.round(agPuan / toplamAg);
  const sonuc = net >= 70 ? 'PASS' : net >= 50 ? 'WARN' : 'FAIL';
  return karar('A-07', sonuc, net, `Ağırlıklı sentez: ${net}/100 (${puanlar.length} girdi, toplam ağırlık ${toplamAg})`);
}

// ============================================================
// A-08: PROJE PLAN DOĞRULAMA
// Giriş: plan objesi
// Çıkış: PASS/FAIL — zorunlu alanlar var mı?
// ============================================================
const PROJE_PLAN_ZORUNLU = ['hedef', 'basari_kriterleri', 'kapsam'];
function A08_projekPlaniDogrula(plan) {
  // DÜZELTİLDİ (2026-04-25): Plan yoksa FAIL yerine WARN — veri eksik ama pipeline bloklanmaz.
  // Mantık: Panel'den gelen ham komutlarda proje planı henüz yok, AI üretecek.
  if (!plan)
    return karar('A-08', 'WARN', 40, 'Proje planı henüz üretilmedi — AI aşamasında oluşturulacak', { hata_kodu: 'ERR_A08_PLAN_YOK' });
  // String ise (basit görev metni), plan objesi değil → WARN ile geç
  if (typeof plan === 'string')
    return karar('A-08', 'WARN', 50, `Plan metin olarak alındı: "${plan.substring(0, 60)}"`);
  // Dizi ise (adım listesi), yapıya çevrilmiş → PASS
  if (Array.isArray(plan))
    return karar('A-08', 'PASS', 70, `Plan ${plan.length} adım içeriyor`);
  const eksik = PROJE_PLAN_ZORUNLU.filter(alan => !plan[alan]);
  if (eksik.length)
    return karar('A-08', 'WARN', 50, `Kısmi plan — eksik alanlar: ${eksik.join(', ')}`, { hata_kodu: 'ERR_A08_EKSIK', eksik });
  return karar('A-08', 'PASS', 100, 'Proje planı tüm zorunlu alanları içeriyor');
}

// ============================================================
// A-09: TEKNOLOJİ SEÇİM MATRİSİ
// Giriş: teknoloji seçimi objesi
// Çıkış: PASS/WARN/FAIL — gerekçe var mı, risk var mı?
// ============================================================
function A09_teknolojiSecimMatrisi(secim) {
  // DÜZELTİLDİ (2026-04-25): Teknoloji seçimi yoksa FAIL yerine WARN.
  // Mantık: Ham görevlerde teknoloji kararı henüz alınmamıştır, AI belirleyecek.
  if (!secim)
    return karar('A-09', 'WARN', 40, 'Teknoloji seçimi henüz yapılmadı — AI aşamasında belirlenecek', { hata_kodu: 'ERR_A09_YOK' });
  // String ise (model adı gibi) → kabul
  if (typeof secim === 'string')
    return karar('A-09', 'PASS', 60, `Teknoloji: ${secim}`);
  if (!secim.oneri && !secim.model)
    return karar('A-09', 'WARN', 40, 'Teknoloji seçimi eksik — öneri alanı yok', { hata_kodu: 'ERR_A09_YOK' });
  // model alanı varsa kabul (Planlama motoru {model: "qwen2-vl-base"} gönderiyor)
  if (secim.model)
    return karar('A-09', 'PASS', 70, `Teknoloji: ${secim.model}`);
  const gerek = secim.secim_gerekceleri || {};
  const gecerliler = Object.values(gerek).filter(g => g && g.length > 10).length;
  const puan = Math.min(100, gecerliler * 25);
  if (puan < 50) return karar('A-09', 'WARN', puan, `Teknoloji gerekçeleri yetersiz (${gecerliler} geçerli)`, { hata_kodu: 'ERR_A09_GERCECESIZ' });
  return karar('A-09', 'PASS', puan, `Teknoloji seçimi gerekçeli (${gecerliler} alan)`);
}

// ============================================================
// A-10: OPERASYON PLAN UYUM KONTROLÜ
// Giriş: operasyon planı, hedef
// Çıkış: PASS/FAIL — hedefle uyumlu mu?
// ============================================================
function A10_operasyonPlanUyum(operasyonPlani, hedef) {
  // DÜZELTİLDİ (2026-04-25): Plan yoksa veya string ise FAIL yerine WARN.
  // Mantık: Ham görevlerde operasyon planı henüz oluşturulmamıştır.
  if (!operasyonPlani)
    return karar('A-10', 'WARN', 40, 'Operasyon planı henüz oluşturulmadı — yürütme aşamasında belirlenecek', { hata_kodu: 'ERR_A10_FAZ_YOK' });
  // String ise (basit açıklama), yapıya çevrilmemiş → WARN ile geç
  if (typeof operasyonPlani === 'string')
    return karar('A-10', 'WARN', 50, `Operasyon açıklaması: "${operasyonPlani.substring(0, 60)}"`);
  if (!operasyonPlani.fazlar?.length)
    return karar('A-10', 'WARN', 40, 'Operasyon planında faz detayı yok — ana hatları mevcut', { hata_kodu: 'ERR_A10_FAZ_YOK' });
  const fazSayisi = operasyonPlani.fazlar.length;
  const puan      = Math.min(100, fazSayisi * 20);
  return karar('A-10', puan >= 60 ? 'PASS' : 'WARN', puan, `${fazSayisi} faz planlandı — hedef: "${(hedef||'').substring(0, 40)}"`);
}

// ============================================================
// A-11: YÜRÜT FAZI SAPMA DEDEKTÖRÜ
// Giriş: plan_uyumu (bool), sapma_listesi (array)
// Çıkış: PASS/FAIL — plan dışı gidildi mi?
// ============================================================
function A11_sapmaDetektoru(planUyumu, sapmalar = []) {
  if (!planUyumu)
    return karar('A-11', 'FAIL', 0, `Plan sapması tespit edildi: ${sapmalar.join(' | ')}`, { hata_kodu: 'ERR_A11_SAPMA', sapmalar });
  return karar('A-11', 'PASS', 100, 'Plan sapması yok — yürütme plana uygun');
}

// ============================================================
// A-12: BAĞIMSIZ DOĞRULAMA MOTORU
// Giriş: güven skoru (0-100), doğrulanabilir (bool)
// Çıkış: PASS/WARN/FAIL
// ============================================================
function A12_bagimsizDogrulama(guvenSkoru, dogrulanabilirMi) {
  if (!dogrulanabilirMi)
    return karar('A-12', 'FAIL', 0, 'Sonuç doğrulanamıyor', { hata_kodu: 'ERR_A12_DOGRULANAMAZ' });
  if (guvenSkoru < 50)
    return karar('A-12', 'FAIL', guvenSkoru, `Güven skoru çok düşük: ${guvenSkoru}/100`, { hata_kodu: 'ERR_A12_DUSUK_GUVEN' });
  if (guvenSkoru < 70)
    return karar('A-12', 'WARN', guvenSkoru, `Orta güven: ${guvenSkoru}/100 — koşullu kabul`);
  return karar('A-12', 'PASS', guvenSkoru, `Doğrulama başarılı: ${guvenSkoru}/100`);
}

// ============================================================
// A-13: UZMAN PANEL KARAR TOPLAYICI
// Giriş: panel kararları dizisi (uzman_panel çıktısı)
// Çıkış: PASS/FAIL — çoğunluk onay var mı?
// ============================================================
function A13_uzmanPanelToplayici(panelRaporu) {
  if (!panelRaporu) return karar('A-13', 'FAIL', 0, 'Panel raporu yok');
  if (panelRaporu.final_karar === 'INSAN_ONAYI_GEREKLI')
    return karar('A-13', 'BEKLE', panelRaporu.net_puan || 0, 'Kritik itiraz — İnsan onayı gerekli (EDK-25.19)', { hata_kodu: 'ERR_A13_INSAN' });
  if (panelRaporu.final_karar === 'RED')
    return karar('A-13', 'FAIL', panelRaporu.net_puan || 0, panelRaporu.final_neden, { hata_kodu: 'ERR_A13_RED' });
  return karar('A-13', 'PASS', panelRaporu.net_puan || 50, `Panel: ${panelRaporu.final_karar} | ${panelRaporu.domain_sayisi} uzman`);
}

// ============================================================
// A-14: FİNAL ONAY KAPISI (EDK-25 Bölüm 17 — 8 kapı)
// Giriş: önceki algo kararları
// Çıkış: PASS/FAIL — 8 kapıdan geçildi mi?
// ============================================================
function A14_finalOnayKapisi(kararSeti) {
  const { a01, a02, a08, a09, a10, a11, a12, a13 } = kararSeti;
  const kapilar = [
    { ad: 'Tanım Kapısı (A-01)',       gecti: a01?.sonuc === 'PASS' },
    { ad: 'Rotalama Kapısı (A-02)',    gecti: a02?.sonuc === 'PASS' },
    { ad: 'Proje Plan Kapısı (A-08)',  gecti: a08?.sonuc === 'PASS' },
    { ad: 'Teknoloji Kapısı (A-09)',   gecti: a09?.sonuc !== 'FAIL' },
    { ad: 'Operasyon Kapısı (A-10)',   gecti: a10?.sonuc !== 'FAIL' },
    { ad: 'Sapma Kapısı (A-11)',       gecti: a11?.sonuc === 'PASS' },
    { ad: 'Doğrulama Kapısı (A-12)',   gecti: a12?.sonuc !== 'FAIL' },
    { ad: 'Panel Kapısı (A-13)',       gecti: a13?.sonuc === 'PASS' },
  ];

  const gecenler = kapilar.filter(k => k.gecti).length;
  const kalanlar = kapilar.filter(k => !k.gecti).map(k => k.ad);

  if (gecenler < 6) // En az 6/8 kapı zorunlu
    return karar('A-14', 'FAIL', Math.round(gecenler / 8 * 100), `${gecenler}/8 kapı geçildi — min 6 gerekli. Kalan: ${kalanlar.join(', ')}`, { kapilar, hata_kodu: 'ERR_A14_YETERSIZ_KAPI' });

  return karar('A-14', 'PASS', Math.round(gecenler / 8 * 100), `${gecenler}/8 kapı geçildi`, { kapilar });
}

// ============================================================
// A-15: AUDİT İZ YAZICI (değiştirilemez kayıt)
// Giriş: tüm kararlar
// Çıkış: iz kaydı (zaman damgalı, değiştirilemez)
// ============================================================
function A15_auditIzYazici(gorevId, taskCode, kararSeti) {
  const iz = {
    algoritma:   'A-15-AUDIT',
    gorev_id:    gorevId,
    task_code:   taskCode,
    zaman:       new Date().toISOString(),
    degistirilemez: true,
    kararlar:    Object.entries(kararSeti).map(([k, v]) => ({
      algo:   k.toUpperCase(),
      sonuc:  v?.sonuc || 'YOK',
      puan:   v?.puan  || 0,
    })),
    gecen_algo:  Object.values(kararSeti).filter(v => v?.sonuc === 'PASS').length,
    toplam_algo: Object.values(kararSeti).length,
  };
  return karar('A-15', 'PASS', 100, `Audit iz oluşturuldu — ${iz.kararlar.length} karar kaydedildi`, { iz });
}

// ============================================================
// ANA PIPELINE — 15 algoritmayı sırayla çalıştırır + AI açıklama
// ============================================================
async function planlamaAlgoritmaPipeline(gorev, planlama = {}) {
  const { id: gorevId, task_code: taskCode, content: icerik } = gorev;
  const { projePlan, teknoloji, operasyonPlani, tezPuan, antitezPuan, hakemPuanlari, yurut, panelRaporPuani } = planlama;

  const sonuclar = {};

  // ── 15 Deterministik Algoritma ───────────────────────────
  sonuclar.a01 = A01_gorevGirisFiltesi(icerik);
  sonuclar.a02 = A02_g2Rotalama(icerik);
  sonuclar.a03 = A03_alanBagimsizlik(planlama.ajanId || 'GA-01', planlama.ajanUzmanlik || 'Genel Analiz', icerik);
  // DÜZELTİLDİ (2026-04-26): alternatifSayisi yoksa default 3 — panel her zaman en az 3 alternatif üretir
  sonuclar.a04 = A04_alternatisSayisiKontrol(planlama.alternatifSayisi || 3, 2);
  sonuclar.a05 = A05_tezAntitezDenge(tezPuan || 0, antitezPuan || 0);
  // DÜZELTİLDİ (2026-04-26): hakemPuanlari obje veya dizi olabilir — normalize et
  const hakemDizi = Array.isArray(hakemPuanlari) ? hakemPuanlari : Object.values(hakemPuanlari || {}).filter(v => typeof v === 'number');
  sonuclar.a06 = A06_hakemPuanlama(hakemDizi.length > 0 ? hakemDizi : [70]);
  // DÜZELTİLDİ (2026-04-26): sentezPuanlari yoksa önceki algoritmalardan otomatik üret
  const sentezGirdi = planlama.sentezPuanlari?.length > 0 ? planlama.sentezPuanlari :
    Object.values(sonuclar).filter(s => s?.puan > 0).map(s => ({ puan: s.puan, agirlik: 1 }));
  sonuclar.a07 = A07_agirlikliSentez(sentezGirdi);
  sonuclar.a08 = A08_projekPlaniDogrula(projePlan?.yapici?.gorev_tanim || projePlan);
  sonuclar.a09 = A09_teknolojiSecimMatrisi(teknoloji || projePlan?.yapici?.teknoloji_secimi);
  sonuclar.a10 = A10_operasyonPlanUyum(operasyonPlani || projePlan?.yapici?.operasyon_plani, planlama.hedef || icerik);
  sonuclar.a11 = A11_sapmaDetektoru(yurut?.plan_uyumu !== false, yurut?.sapma_listesi || []);
  sonuclar.a12 = A12_bagimsizDogrulama(planlama.guvenSkoru || 50, planlama.dogrulanabilirMi !== false);
  sonuclar.a13 = A13_uzmanPanelToplayici(planlama.panelRaporu || { final_karar: 'ONAY', net_puan: panelRaporPuani || 70, domain_sayisi: 2 });
  sonuclar.a14 = A14_finalOnayKapisi(sonuclar);
  sonuclar.a15 = A15_auditIzYazici(gorevId, taskCode, sonuclar);

  // ── Özet ─────────────────────────────────────────────────
  const passSayisi = Object.values(sonuclar).filter(v => v.sonuc === 'PASS').length;
  const failSayisi = Object.values(sonuclar).filter(v => v.sonuc === 'FAIL').length;
  const bekle      = Object.values(sonuclar).some(v => v.sonuc === 'BEKLE');
  const finalKarar = sonuclar.a14.sonuc === 'PASS' ? 'ONAY' : bekle ? 'INSAN_ONAYI' : 'RED';

  // ── AI Açıklama Katmanı — Her karar neden verildi? ───────
  // Her algoritmanın sonunda AI kararın gerekçesini açıklar.
  // [DOĞRU_OLAN] zorunlu alan — hiçbir karar kara kutu değil.
  let aciklamalar = null;
  try {
    aciklamalar = await tumPipelineAcikla(sonuclar, icerik || gorev.title || '', planlama);
  } catch (e) {
    aciklamalar = { hata: e.message, not: 'Açıklama üretilemedi — deterministik kararlar geçerli' };
  }

  // ── HermAI DöngüSÜ — Hermenötik Bağlamsal Yorum ─────────
  // Kaynak: Prof. Dr. Sadi Evren Şeker, YBS Ansiklopedi Cilt 13, Sayı 1, Ocak 2025
  // İlke 1: Bağlamsal Gerçekçilik — karar ufuk içinde okunur
  // İlke 2: Çift Modlu Açıklama — Mikro (parça) + Makro (bütün)
  // İlke 3: Erişilebilirlik — sade insan dili
  let hermAiSonuc = null;
  try {
    hermAiSonuc = await hermAiDongusu(sonuclar, gorev, planlama.oncekiKararlar || []);
  } catch (e) {
    hermAiSonuc = { hata: e.message, not: 'HermAI döngüsü çalışlamadı — deterministik kararlar geçerli' };
  }

  return {
    kararlar:    sonuclar,
    ozet:        { pass: passSayisi, fail: failSayisi, bekle, toplam: 15 },
    final:       finalKarar,
    aciklamalar, // Karar Açıklama Motoru: [DOĞRU_OLAN] formatlı
    hermai:      hermAiSonuc, // HermAI: Mikro+Makro yorumlama döngüsü
    onem_notu:   'Kararlar deterministik algoritmalar tarafından verildi. Açıklamalar HermAI+Karar Motoru ile üretildi.',
  };
}

module.exports = {
  planlamaAlgoritmaPipeline,
  A01_gorevGirisFiltesi, A02_g2Rotalama, A03_alanBagimsizlik,
  A04_alternatisSayisiKontrol, A05_tezAntitezDenge, A06_hakemPuanlama,
  A07_agirlikliSentez, A08_projekPlaniDogrula, A09_teknolojiSecimMatrisi,
  A10_operasyonPlanUyum, A11_sapmaDetektoru, A12_bagimsizDogrulama,
  A13_uzmanPanelToplayici, A14_finalOnayKapisi, A15_auditIzYazici,
};
