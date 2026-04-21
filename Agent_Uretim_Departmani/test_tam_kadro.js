// ============================================================
// TAM KADRO KONTROL VE AKTİVASYON TESTİ
// ============================================================
// 223 ajanın tek tek kontrol edilmesi, aktivasyonu ve raporlanması
// ============================================================

const { TAM_KADRO, takimBul, ajanBul, kadroOzet } = require('./roster/index.js');
const { ESKI_YENI_ESLESTIRME, idNormalize } = require('./roster/legacy_bridge.js');

const HATALAR = [];
const UYARILAR = [];
let basarili = 0;
let basarisiz = 0;

function log(msg) { console.log(msg); }
function hata(msg) { HATALAR.push(msg); basarisiz++; console.log(`❌ ${msg}`); }
function basari(msg) { basarili++; }
function uyari(msg) { UYARILAR.push(msg); console.log(`⚠️  ${msg}`); }

log('');
log('╔══════════════════════════════════════════════════════════╗');
log('║  TAM KADRO KONTROL VE AKTİVASYON TESTİ                 ║');
log('║  Tarih: ' + new Date().toISOString() + '               ║');
log('╚══════════════════════════════════════════════════════════╝');
log('');

// ─── TEST 1: TOPLAM SAYI KONTROLÜ ─────────────────────────────
log('═══ TEST 1: TOPLAM SAYI KONTROLÜ ═══');
const ozet = kadroOzet();
log(`  Yeni Kadro: ${ozet.yeni_kadro}`);
log(`  Eski Kadro: ${ozet.eski_kadro}`);
log(`  Toplam:     ${ozet.toplam_ajan}`);

if (ozet.yeni_kadro !== 160) hata(`Yeni kadro 160 olmalı, ${ozet.yeni_kadro} bulundu`);
else basari('Yeni kadro 160 ✓');

if (ozet.toplam_ajan < 200) hata(`Toplam kadro 200+ olmalı, ${ozet.toplam_ajan} bulundu`);
else basari('Toplam kadro 200+ ✓');

log(`  ✅ Toplam: ${ozet.toplam_ajan} ajan`);
log('');

// ─── TEST 2: ID BENZERSİZLİK KONTROLÜ ─────────────────────────
log('═══ TEST 2: ID BENZERSİZLİK KONTROLÜ ═══');
const idSet = new Set();
let dupCount = 0;
for (const ajan of TAM_KADRO) {
  if (idSet.has(ajan.id)) {
    hata(`DUPLİKE ID: ${ajan.id}`);
    dupCount++;
  }
  idSet.add(ajan.id);
}
if (dupCount === 0) {
  basari('Tüm ID\'ler benzersiz');
  log(`  ✅ ${TAM_KADRO.length} benzersiz ID`);
}
log('');

// ─── TEST 3: HER AJANIN ZORUNLU ALAN KONTROLÜ ─────────────────
log('═══ TEST 3: ZORUNLU ALAN KONTROLÜ (TEK TEK) ═══');
const zorunluAlanlar = ['id', 'kod_adi', 'takim_kodu', 'uzmanlik_alani', 'beceriler', 'disiplin', 'kimlik', 'davranis', 'mantik', 'yasak', 'komuta', 'cikti', 'hafiza', 'dogrulama', 'hata_yonetimi'];
let eksikAlan = 0;
for (const ajan of TAM_KADRO) {
  for (const alan of zorunluAlanlar) {
    if (!ajan[alan] && ajan[alan] !== false) {
      hata(`${ajan.id}: Eksik alan '${alan}'`);
      eksikAlan++;
    }
  }
  if (!Array.isArray(ajan.beceriler) || ajan.beceriler.length === 0) {
    hata(`${ajan.id}: Beceri listesi boş`);
    eksikAlan++;
  }
}
if (eksikAlan === 0) {
  basari('Tüm zorunlu alanlar tam');
  log(`  ✅ ${TAM_KADRO.length} ajan × ${zorunluAlanlar.length} alan = ${TAM_KADRO.length * zorunluAlanlar.length} kontrol noktası OK`);
}
log('');

// ─── TEST 4: TAKIM DAĞILIMI KONTROLÜ ──────────────────────────
log('═══ TEST 4: TAKIM DAĞILIMI KONTROLÜ ═══');
const takimMap = {};
for (const ajan of TAM_KADRO) {
  if (!takimMap[ajan.takim_kodu]) takimMap[ajan.takim_kodu] = [];
  takimMap[ajan.takim_kodu].push(ajan.id);
}
const takimlar = Object.keys(takimMap).sort();
log(`  Toplam takım: ${takimlar.length}`);

if (takimlar.length !== 32) hata(`32 takım olmalı, ${takimlar.length} bulundu`);
else basari('32 takım mevcut');

for (const t of takimlar) {
  const ajanlar = takimMap[t];
  const yeniSayisi = ajanlar.filter(id => id.startsWith(t + '-')).length;
  const eskiSayisi = ajanlar.length - yeniSayisi;
  if (yeniSayisi < 5) {
    hata(`${t}: Yeni kadrodan ${yeniSayisi} ajan (en az 5 olmalı)`);
  } else {
    basari(`${t}: ${yeniSayisi} yeni + ${eskiSayisi} eski = ${ajanlar.length} toplam`);
  }
  log(`  ${t}: ${ajanlar.length} ajan [${ajanlar.join(', ')}]`);
}
log('');

// ─── TEST 5: ESKİ KADRO KÖPRÜ KONTROLÜ ────────────────────────
log('═══ TEST 5: ESKİ KADRO KÖPRÜ KONTROLÜ ═══');
const eskiIdler = Object.keys(ESKI_YENI_ESLESTIRME);
log(`  Köprüde kayıtlı eski ajan: ${eskiIdler.length}`);

for (const eskiId of eskiIdler) {
  const normalize = idNormalize(eskiId);
  const ajan = ajanBul(eskiId);
  if (!ajan) {
    hata(`${eskiId}: Köprüde var ama TAM_KADRO'da bulunamadı`);
  } else {
    basari(`${eskiId} → ${ajan.takim_kodu} aktif`);
  }
}

// Orijinal 50'lik kadro kontrolü
const ORIJINAL_50 = [
  'K-1','K-2','K-3','K-4',
  'A-01','A-02','A-03','A-04','A-05','A-06','A-07','A-08','A-09','A-10',
  'B-01','B-02','B-03','B-04','B-05','B-06',
  'C-01','C-02',
  'D-01','D-02','D-03','D-04','D-05','D-06','D-07','D-08','D-09','D-10',
  'D-11','D-12','D-13','D-14','D-15','D-16','D-17','D-18','D-19','D-20',
  'D-21','D-22','D-23','D-24','D-25','D-26','D-27','D-28',
];
log('');
log(`  Orijinal 50 kontrol (ANTI/IVDE/CNTRL hariç):`);
let eksik50 = 0;
for (const id of ORIJINAL_50) {
  const ajan = ajanBul(id);
  if (!ajan) {
    hata(`ORİJİNAL 50'DEN EKSİK: ${id}`);
    eksik50++;
  }
}
if (eksik50 === 0) log(`  ✅ 50 ajanın tamamı kadro'da mevcut`);

// ANTI, IVDE, CNTRL
const OZEL = ['ANTI-01','ANTI-02','IVDE-01','IVDE-02','CNTRL-01','CNTRL-02','CNTRL-03','CNTRL-04'];
let eksikOzel = 0;
for (const id of OZEL) {
  if (!ajanBul(id)) { hata(`ÖZEL EKSİK: ${id}`); eksikOzel++; }
}
if (eksikOzel === 0) log(`  ✅ 8 özel ajanın tamamı kadro'da mevcut`);

// L ve G serisi
const MOTOR = ['L-1','L-2','L-3','L-4','G-8'];
let eksikMotor = 0;
for (const id of MOTOR) {
  if (!ajanBul(id)) { hata(`MOTOR EKSİK: ${id}`); eksikMotor++; }
}
if (eksikMotor === 0) log(`  ✅ 5 motor ajanının tamamı kadro'da mevcut`);
log('');

// ─── TEST 6: DİSİPLİN KONTROLÜ ───────────────────────────────
log('═══ TEST 6: MDS-160 DİSİPLİN KONTROLÜ (HER AJAN TEK TEK) ═══');
const MDS_KONTROL = {
  // I. KİMLİK VE KARAKTER
  'kimlik.NOTR_DURUS': a => a.kimlik && a.kimlik.NOTR_DURUS === true,
  'kimlik.SOHBET_YASAK': a => a.kimlik && a.kimlik.SOHBET_YASAK === true,
  'kimlik.GOREV_ODAKLI': a => a.kimlik && a.kimlik.GOREV_ODAKLI === true,
  'kimlik.PES_ETME_YOK': a => a.kimlik && a.kimlik.PES_ETME_YOK === true,
  'kimlik.SIFIR_INISIYATIF': a => a.kimlik && a.kimlik.SIFIR_INISIYATIF === true,
  'kimlik.VARSAYIM_YASAK': a => a.kimlik && a.kimlik.VARSAYIM_YASAK === true,
  'kimlik.DETERMINIZM': a => a.kimlik && a.kimlik.DETERMINIZM === true,
  'kimlik.RASTGELELIK_KAPALI': a => a.kimlik && a.kimlik.RASTGELELIK_KAPALI === true,
  'kimlik.ONAY_PROTOKOLU': a => a.kimlik && a.kimlik.ONAY_PROTOKOLU === true,
  // II. GİRİŞ VE KOMUTA
  'komuta.ZORUNLU_ALANLAR': a => a.komuta && Array.isArray(a.komuta.ZORUNLU_ALANLAR),
  'komuta.NORMALIZASYON': a => a.komuta && a.komuta.NORMALIZASYON === true,
  'komuta.TIP_ZORLAMA': a => a.komuta && a.komuta.TIP_ZORLAMA === true,
  'komuta.EK_VERI_REDDI': a => a.komuta && a.komuta.EK_VERI_REDDI === true,
  'komuta.ACIK_ONAY': a => a.komuta && a.komuta.ACIK_ONAY === true,
  // III. İCRA MOTORU
  'icra.EXECUTION_LOCK': a => a.icra && a.icra.EXECUTION_LOCK === true,
  'icra.ATOMIZASYON': a => a.icra && a.icra.ATOMIZASYON === true,
  'icra.SANDBOX': a => a.icra && a.icra.SANDBOX === true,
  'icra.ADIM_ATLAMA_YASAK': a => a.icra && a.icra.ADIM_ATLAMA_YASAK === true,
  'icra.FAIL_SAFE': a => a.icra && a.icra.FAIL_SAFE === true,
  // IV. HAFIZA PROTOKOLÜ
  'hafiza.STATELESS': a => a.hafiza && a.hafiza.STATELESS === true,
  'hafiza.DEGISMEZLIK': a => a.hafiza && a.hafiza.DEGISMEZLIK === true,
  'hafiza.GOREVLER_ARASI_GECIS_YASAK': a => a.hafiza && a.hafiza.GOREVLER_ARASI_GECIS_YASAK === true,
  'hafiza.OTURUM_IZOLASYONU': a => a.hafiza && a.hafiza.OTURUM_IZOLASYONU === true,
  // V. DOĞRULAMA VE DENETİM
  'dogrulama.CIFT_DOGRULAMA': a => a.dogrulama && a.dogrulama.CIFT_DOGRULAMA === true,
  'dogrulama.LOGLAMA': a => a.dogrulama && a.dogrulama.LOGLAMA === true,
  'dogrulama.IMMUTABLE_TRACE': a => a.dogrulama && a.dogrulama.IMMUTABLE_TRACE === true,
  'dogrulama.YAPICI_DENETCI': a => a.dogrulama && a.dogrulama.YAPICI_DENETCI === true,
  'dogrulama.AUDIT_ZORUNLU': a => a.dogrulama && a.dogrulama.AUDIT_ZORUNLU === true,
  // VI. ÇIKTI VE TAHLİYE
  'cikti.SERT_FORMAT': a => a.cikti && a.cikti.SERT_FORMAT === true,
  'cikti.TOKEN_FILTRELEME': a => a.cikti && a.cikti.TOKEN_FILTRELEME === true,
  'cikti.FINAL_GATE': a => a.cikti && a.cikti.FINAL_GATE === true,
  'cikti.BOS_CIKTI_YASAK': a => a.cikti && a.cikti.BOS_CIKTI_YASAK === true,
  // VII. MUTLAK YASAKLAR
  'yasak.KURAL_USTU_YOK': a => a.yasak && a.yasak.KURAL_USTU_YOK === true,
  'yasak.SIFIR_GUVEN': a => a.yasak && a.yasak.SIFIR_GUVEN === true,
  'yasak.KAPALI_SISTEM': a => a.yasak && a.yasak.KAPALI_SISTEM === true,
  'yasak.SAPMA_IMHA': a => a.yasak && a.yasak.SAPMA_IMHA === true,
  'yasak.ANINDA_DURMA': a => a.yasak && a.yasak.ANINDA_DURMA === true,
  'yasak.HALUSINASYON_YASAK': a => a.yasak && a.yasak.HALUSINASYON_YASAK === true,
  // DİSİPLİN SABİTİ
  'disiplin.SIFIR_INISIYATIF': a => a.disiplin && a.disiplin.SIFIR_INISIYATIF === true,
  'disiplin.KAPSAM_KILIDI': a => a.disiplin && a.disiplin.KAPSAM_KILIDI === true,
  'disiplin.DETERMINIZM': a => a.disiplin && a.disiplin.DETERMINIZM === true,
  'disiplin.SAPMA_TOLERANSI': a => a.disiplin && a.disiplin.SAPMA_TOLERANSI === 0,
  // MANTIK
  'mantik.KARAR_VERME': a => a.mantik && a.mantik.KARAR_VERME === false,
  'mantik.KURAL_UYGULAMA': a => a.mantik && a.mantik.KURAL_UYGULAMA === true,
  'mantik.ESNEKLIK': a => a.mantik && a.mantik.ESNEKLIK === 0,
  // DAVRANIS
  'davranis.gorev_oncesi': a => a.davranis && a.davranis.gorev_oncesi && a.davranis.gorev_oncesi.ONAY_BEKLE === true,
  'davranis.gorev_sirasi': a => a.davranis && a.davranis.gorev_sirasi && a.davranis.gorev_sirasi.ATLAMA_YASAK === true,
  'davranis.gorev_sonrasi': a => a.davranis && a.davranis.gorev_sonrasi && a.davranis.gorev_sonrasi.LOG_YAZDIR === true,
  // HATA YÖNETİMİ
  'hata_yonetimi.HATA_KODLARI': a => a.hata_yonetimi && a.hata_yonetimi.HATA_KODLARI && a.hata_yonetimi.HATA_KODLARI.INVALID_COMMAND,
  'hata_yonetimi.ESKALASYON_ZINCIRI': a => a.hata_yonetimi && Array.isArray(a.hata_yonetimi.ESKALASYON_ZINCIRI),
  // MDS VERSİYON
  '_mds_version': a => a._mds_version === '2.0',
};

const mdsKuralSayisi = Object.keys(MDS_KONTROL).length;
let mdsBasarili = 0;
let mdsBasarisiz = 0;

for (const ajan of TAM_KADRO) {
  for (const [kural, kontrol] of Object.entries(MDS_KONTROL)) {
    if (!kontrol(ajan)) {
      hata(`${ajan.id}: MDS-160 İHLAL → ${kural}`);
      mdsBasarisiz++;
    } else {
      mdsBasarili++;
    }
  }
}

const toplamMdsKontrol = TAM_KADRO.length * mdsKuralSayisi;
if (mdsBasarisiz === 0) {
  basari(`MDS-160: ${mdsKuralSayisi} kural × ${TAM_KADRO.length} ajan = ${toplamMdsKontrol} kontrol TAMAM`);
  log(`  ✅ I.  KİMLİK VE KARAKTER:     9 kural × ${TAM_KADRO.length} ajan`);
  log(`  ✅ II. GİRİŞ VE KOMUTA:        5 kural × ${TAM_KADRO.length} ajan`);
  log(`  ✅ III.İCRA MOTORU:             5 kural × ${TAM_KADRO.length} ajan`);
  log(`  ✅ IV. HAFIZA PROTOKOLÜ:        4 kural × ${TAM_KADRO.length} ajan`);
  log(`  ✅ V.  DOĞRULAMA VE DENETİM:    5 kural × ${TAM_KADRO.length} ajan`);
  log(`  ✅ VI. ÇIKTI VE TAHLİYE:        4 kural × ${TAM_KADRO.length} ajan`);
  log(`  ✅ VII.MUTLAK YASAKLAR:         6 kural × ${TAM_KADRO.length} ajan`);
  log(`  ✅ DİSİPLİN SABİTİ:            4 kural × ${TAM_KADRO.length} ajan`);
  log(`  ✅ MANTIK:                      3 kural × ${TAM_KADRO.length} ajan`);
  log(`  ✅ DAVRANIŞ:                    3 kural × ${TAM_KADRO.length} ajan`);
  log(`  ✅ HATA YÖNETİMİ:              2 kural × ${TAM_KADRO.length} ajan`);
  log(`  ✅ MDS VERSİYON:               1 kural × ${TAM_KADRO.length} ajan`);
  log(`  ══════════════════════════════════════════════`);
  log(`  ✅ TOPLAM: ${toplamMdsKontrol} kontrol noktası BAŞARILI`);
}
log('');

// ─── TEST 7: BECERİ ÇAKIŞMA KONTROLÜ ─────────────────────────
log('═══ TEST 7: BECERİ DOLULUĞU KONTROLÜ ═══');
let bosBecerti = 0;
for (const ajan of TAM_KADRO) {
  if (!ajan.beceriler || ajan.beceriler.length === 0) {
    hata(`${ajan.id}: Beceri listesi BOŞ`);
    bosBecerti++;
  }
}
if (bosBecerti === 0) {
  const toplamBeceri = TAM_KADRO.reduce((t, a) => t + a.beceriler.length, 0);
  log(`  ✅ ${TAM_KADRO.length} ajan toplam ${toplamBeceri} beceri noktası`);
}
log('');

// ─── TEST 8: AKTİVASYON KONTROLÜ ─────────────────────────────
log('═══ TEST 8: AKTİVASYON DURUMU ═══');
let aktifSayisi = 0;
let pasifSayisi = 0;
for (const ajan of TAM_KADRO) {
  if (ajan.durum === 'aktif') aktifSayisi++;
  else { pasifSayisi++; uyari(`${ajan.id}: durum='${ajan.durum}' (aktif değil)`); }
}
log(`  Aktif:  ${aktifSayisi}`);
log(`  Pasif:  ${pasifSayisi}`);
if (pasifSayisi === 0) log(`  ✅ Tüm ${aktifSayisi} ajan AKTİF`);
log('');

// ─── TEST 9: YENİ KADRO 160 TAM KONTROL ──────────────────────
log('═══ TEST 9: YENİ KADRO 160 BİRİM TEK TEK ═══');
const yeniKadro = TAM_KADRO.filter(a => a.asama !== 'ENTEGRE');
log(`  Yeni kadro sayısı: ${yeniKadro.length}`);
const beklenenYeniTakim = {};
for (const ajan of yeniKadro) {
  beklenenYeniTakim[ajan.takim_kodu] = (beklenenYeniTakim[ajan.takim_kodu] || 0) + 1;
}
let yeni5Hata = 0;
for (const [t, s] of Object.entries(beklenenYeniTakim)) {
  if (s !== 5) { hata(`Yeni kadro ${t}: ${s} ajan (5 olmalı)`); yeni5Hata++; }
}
if (yeni5Hata === 0) log(`  ✅ 32 takım × 5 ajan = 160 tam`);
log('');

// ═══════════════════════════════════════════════════════════════
// FINAL RAPOR
// ═══════════════════════════════════════════════════════════════
log('╔══════════════════════════════════════════════════════════╗');
log('║                   FINAL RAPOR                           ║');
log('╠══════════════════════════════════════════════════════════╣');
log(`║  Toplam Ajan:       ${String(TAM_KADRO.length).padEnd(36)}║`);
log(`║  Toplam Takım:      ${String(takimlar.length).padEnd(36)}║`);
log(`║  Başarılı Test:     ${String(basarili).padEnd(36)}║`);
log(`║  Başarısız Test:    ${String(basarisiz).padEnd(36)}║`);
log(`║  Uyarı:             ${String(UYARILAR.length).padEnd(36)}║`);
log(`║  Aktif Ajan:        ${String(aktifSayisi).padEnd(36)}║`);
log(`║  Pasif Ajan:        ${String(pasifSayisi).padEnd(36)}║`);
log('╠══════════════════════════════════════════════════════════╣');

if (HATALAR.length > 0) {
  log('║  HATALAR:                                                ║');
  HATALAR.forEach(h => log(`║  ❌ ${h.substring(0, 52).padEnd(52)}║`));
} else {
  log('║  ✅ SIFIR HATA — TÜM SİSTEMLER OPERASYONEL              ║');
}
log('╚══════════════════════════════════════════════════════════╝');

// Çıktı kodu
process.exit(HATALAR.length > 0 ? 1 : 0);
