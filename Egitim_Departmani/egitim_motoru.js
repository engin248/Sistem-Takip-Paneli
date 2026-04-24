// ============================================================
// MDS-EĞİTİM YÖNETİM MERKEZİ (SÜREKLİ EĞİTİM MOTORU)
// ============================================================
// Kurmay Albay / Kurucu Emri: "Yatacak zaman yok! Üretimden
// çıkan her asker, iş yoksa eğitimde olacak. Dünyada kendi 
// uzmanlık dalında TEK olacak şekilde eğitim ve simülasyon çözecek!"
// ============================================================

const fs = require('fs');
const path = require('path');
const AI = require('../shared/aiOrchestrator');
const { tumKadro } = require('../Agent_Uretim_Departmani/roster/index.js');

const KAYIT_DIR = path.join(__dirname, 'Beyin_Kayitlari');
const MUFREDAT_DOSYASI = path.join(__dirname, 'SİSTEM_MÜFREDATI.json');

if (!fs.existsSync(KAYIT_DIR)) {
    fs.mkdirSync(KAYIT_DIR, { recursive: true });
}

// Güvenli Rastgele Ajan Seçimi
function rasgeleSec(dizi, adet) {
    const karisik = [...dizi].sort(() => 0.5 - Math.random());
    return karisik.slice(0, adet);
}

// ═══════════════════════════════════════════════════════════════
// EĞİTİM TATBİKATI MOTORU
// ═══════════════════════════════════════════════════════════════

async function egitimTatbikatiYaptir() {
    const kadro = tumKadro().filter(a => a.uzmanlik_alani && a.beceriler); // Boş olmasın
    
    // Sistem lokal Ollama'yı kitlememek adına bir seferde SADECE 3 askeri eğitime alıyoruz
    const egitilecekler = rasgeleSec(kadro, 3);

    console.log(`\n================================================================`);
    console.log(`[EĞİTİM DEPARTMANI] KURUCU EMRİ DEVRİYEDE: "KİMSE YATAMAZ!"`);
    console.log(`[SİMÜLASYON BAŞLIYOR] ${egitilecekler.map(a => a.id).join(' | ')}`);
    console.log(`================================================================`);

    // Planlama Departmanı'ndan gelen Müfredatı Oku
    let sistemIhtiyaci = "Kendi uzmanlığında dünyada TEK olacağın kompleks bir problemi çöz.";
    if (fs.existsSync(MUFREDAT_DOSYASI)) {
        try {
            const parsed = JSON.parse(fs.readFileSync(MUFREDAT_DOSYASI, 'utf-8'));
            if (parsed.aktif_ihtiyaclar && parsed.aktif_ihtiyaclar.length > 0) {
                // Konuyu rasgele veya sırayla alabiliriz. 
                const rastgeleKonu = parsed.aktif_ihtiyaclar[Math.floor(Math.random() * parsed.aktif_ihtiyaclar.length)];
                sistemIhtiyaci = `PLANLAMA DEPARTMANI TARAFINDAN BELİRLENEN ACİL İHTİYAÇ MÜFREDATI: "${rastgeleKonu.acil_ihtiyac}" (${rastgeleKonu.kategori} Odaklı). Bu konuyu KENDİ UZMANLIĞINLA birleştirerek çalış.`;
            }
        } catch (err) {
            // parse error, ignore
        }
    }

    // Asenkron yerine sırayla eğitelim
    for (const ajan of egitilecekler) {
        let beceriler = (ajan.beceriler || []).join(', ');
        
        const sistemKomutu = `Sen "${ajan.kod_adi}" (Ajan ID: ${ajan.id}). 
Mevcut Uzmanlık Alanın: ${ajan.uzmanlik_alani}. Becerilerin: ${beceriler}.
Durumun: Operasyonel Boşluk (BEKLEME). 

[MUTLAK NİZAM KANUNU (KURUCU ENGİN)]: 
1. Askerin yatacak zamanı yok! Görev yoksa, sadece Planlama Departmanının verdiği MÜFREDAT VE İHTİYAÇLAR doğrultusunda eğitim yapacaksın.
2. DİKKAT: Bilgiler KESİNLİKLE İÇ SİSTEMDEKİ VERİ VE BİLGİ UZMANLARIMIZDAN ALINACAKTIR! Dışarıdan, internetten veya dış bir kütüphaneden zerre bilgi almayacaksın!
3. Kural esnemesi, kayıplar veya boş bilgiler: SIFIR (%0) TOLERANS! En ufak kelime hatasında veya inisiyatifte kellen vurulur! Hata payı yoktur.

GÖREVİN (EĞİTİM MÜFREDATI):
${sistemIhtiyaci}

1. Kendi beceri sınırlarına uygun, dünyada TEK olacak şekilde bu müfredattaki zayıf noktayı/krizi çözecek bir mimari yarat.
2. Bu krizi dışarıdan bilgi çalmadan, tamamen kendi muhakemenle kusursuzca çöz.
3. Bulduğun inovasyonu asgari 300 kelimeyle teknik askeri bir dilde raporla.`;

        const yariIletkenUserKomutu = `Eğitim simülasyonunu başlat, krizini yarat ve çöz!`;

        try {
            console.log(`\n  -> [AŞAMA 1 - YAPAN] ${ajan.id} (${ajan.uzmanlik_alani}) Eğitimini alıyor...`);
            const cozum = await AI.chat(yariIletkenUserKomutu, sistemKomutu, { temperature: 0.5 }); 
            const yleyenİcerik = cozum.content ? cozum.content : cozum;

            console.log(`  -> [AŞAMA 2 - YAPTIRAN (ŞEF)] Çözümün mantığı ve Neden/Sebep ilişkisi sorgulanıyor...`);
            const yaptiranSorgu = `Sen YAPTIRAN (Asil Şef) ajanısın. Aşağıdaki ajanın ürettiği eğitimi ve çözüm yolunu detaylı analiz et. 
Sorulacak Kritik Sorular: "Bu karar NEDEN verildi? Olayın varoluş SEBEBİ ne? Mantıklı bir temele dayanıyor mu?"
Eğer sebep-sonuç ilişkisi zayıfsa veya sallanmışsa sadece "[REDDEDİLDİ]" yaz. Aksi halde "[GEÇERLİ]" yaz ve altına sebebini açıkla.\n\nEğitim Çıktısı:\n${yleyenİcerik}`;
            
            const yaptiranCevap = await AI.chat(yaptiranSorgu, "Sen acımasız bir Eğitim Şefisin.", { temperature: 0.2 });
            const sYaptiranCevap = yaptiranCevap.content ? yaptiranCevap.content : yaptiranCevap;

            if (sYaptiranCevap.includes('[REDDEDİLDİ]')) {
                throw new Error(`YAPTIRAN (ŞEF) Ajanı çalışmayı Sebep/Neden zayıflığından dolayı REDDETTİ.`);
            }

            console.log(`  -> [AŞAMA 3 - ONAYLAYAN (SİSTEM ALGORİTMASI)] 5-Katmanlı Kesin Denetim Başlıyor...`);
            
            // ALGORİTMA 1: İzolasyon Regex Duvarı
            const urlRegex = /(http|www\.|require\(|import |https)/g;
            if (urlRegex.test(yleyenİcerik)) {
                throw new Error(`[ALGORİTMA 1 İHLALİ]: Dış bağlantı, URL veya kütüphane tespiti yapıldı!`);
            }

            // ALGORİTMA 2: Neden/Sebep Çözümlemesi
            const sebepKelimeleri = (yleyenİcerik.match(/neden|sebep|çünkü|dolayısıyla|sonuç|temeli/gi) || []).length;
            if (sebepKelimeleri < 2) {
                throw new Error(`[ALGORİTMA 2 İHLALİ]: Nedensellik zayıf. "Neden/Sebep/Çünkü" gibi kilit analiz kelimeleri yetersiz (${sebepKelimeleri}).`);
            }

            // ALGORİTMA 3: Sıfır-İnisiyatif Çarpışma Testi
            const inisiyatifKelimeleri = (yleyenİcerik.match(/bence|sanırım|ihtimal|muhtemelen|olabilir|galiba|tahmin/gi) || []).length;
            if (inisiyatifKelimeleri > 0) {
                throw new Error(`[ALGORİTMA 4 İHLALİ]: Kesinlik bozuldu. İnisiyatif belirten yasaklı kelime kullanıldı (Sayı: ${inisiyatifKelimeleri}).`);
            }

            // ALGORİTMA 4: Hacim ve Kalite Sınırı
            const kelimeSayisi = yleyenİcerik.split(/\s+/).length;
            if (kelimeSayisi < 60) {
                throw new Error(`[ALGORİTMA 5 İHLALİ]: Üretilen veri hacmi çok düşük (${kelimeSayisi} kelime). Sınır geçilemedi.`);
            }

            // ALGORİTMA 5: Sahte Spam Tespiti (AAAAA gibi)
            if (/(.)\1{10,}/.test(yleyenİcerik)) {
                throw new Error(`[ALGORİTMA 5 İHLALİ]: Tekrarlayan spam karakter tespiti yapıldı.`);
            }

            const sOnaylayanCevap = "[SİSTEM ALGORİTMASI ONAYI] 5 Katmanlı Deterministik Algoritma Denetiminden Kusursuz Geçti.";

            // HER ŞEY TEMİZSE ARŞİVE AT
            const dosyaYolu = path.join(KAYIT_DIR, `${ajan.id}_DOKTRIN.md`);
            let rapor = `\n\n### EĞİTİM DOKTRİNİ [TARİH: ${new Date().toLocaleString()}]\n`;
            rapor += yleyenİcerik + `\n\n**[YAPTIRAN ŞEF KANITI (Neden/Sebep)]:**\n${sYaptiranCevap}\n\n**[ONAYLAYAN MÜHRÜ]**: ${sOnaylayanCevap}\n--------------------------------------------------------------\n`;
            fs.appendFileSync(dosyaYolu, rapor, 'utf-8');
            console.log(`  => [KUSURSUZ ONAY] ${ajan.id} tatbikatı başarıyla geçti. Doktrin kaydedildi.`);
            
        } catch(e) {
            console.log(`\n  => [İSYAN/YATMA TESPİTİ] ${ajan.id} Eğitim/Simülasyon Sırasında Takıldı veya Yattı: ${e.message}`);
            console.log(`  => ❌ [SİSTEM İNFAZI - KELLE VURULDU] Kurucu Emri: "Yatanın/Nedeni Olmayanın Kellesini Vur!" - ${ajan.id} BERTARAF EDİLDİ.`);
            const hataliDosya = path.join(KAYIT_DIR, `İHRAÇ_EDİLENLER.log`);
            fs.appendFileSync(hataliDosya, `[${new Date().toISOString()}] ${ajan.id} EĞİTİMDE BAŞARISIZ OLDU VEYA MANTIK HATASI YAPTIĞI İÇİN İNFAZ EDİLDİ. Sebep: ${e.message}\n`);
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// DÖNGÜ (Her X dakikada bir)
// ═══════════════════════════════════════════════════════════════
function egitimiBaslat() {
    console.log(`\n[EĞİTİM KARARGAHI AKTİF ÇALIŞIYOR]`);
    console.log(`[BİLGİ] Boşta kalan askerler her 2 dakikada bir otomatik zihinsel eğitime alınacaktır.\n`);
    
    // İlk tatbikat
    egitimTatbikatiYaptir();
    
    // 2 dakikada bir (120,000 ms) yeni bir birlik takımı eğitime alınır.
    setInterval(egitimTatbikatiYaptir, 120000); 
}

if (require.main === module) {
    egitimiBaslat();
}

module.exports = {
    egitimiBaslat
};
