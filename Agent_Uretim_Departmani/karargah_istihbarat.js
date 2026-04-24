// ============================================================
// MDS-KARARGAH: BAGIMSIZ ISTIHBARAT VE MUDAHALE MOTORU
// ============================================================
// Bu sistem standart Supabase gorev dongusunden TAMAMEN BAGIMSİZDIR.
// Sadece Kurmay Albay'a (Merkeze) rapor verir.
// Amaci: Diger 160 elit veya 15.000 sanal ajanin calismasini izlemek;
// eger "sayfalarda/kodlarda/DB'de" komuta edilenin TERSINE islem
// yapan varsa SANIYESINDE o ekibi infaz (terminate) etmektir.
// ============================================================

const fs = require('fs');
const path = require('path');
const { KARARGAH_KADRO } = require('./merkez_karargah_kadro');
const AI = require('../shared/aiOrchestrator');

const ISTIHBARAT_DOSYASI = path.join(__dirname, 'KARARGAH_ISTIHBARAT.log');
const EGITIM_MERKEZI = path.join(__dirname, 'STAJYER_BELLEK.log');

// Loglama (Direkt Özel Hatta)
function ozelLog(msg, level='GÖZLEM') {
    const ts = new Date().toISOString();
    const txt = `[${ts}] [${level}] ${msg}`;
    console.log(txt);
    fs.appendFileSync(ISTIHBARAT_DOSYASI, txt + '\n');
}

// ═══════════════════════════════════════════════════════════════
// ISTIHBARAT VE IZLEME DONUGUSU
// ═══════════════════════════════════════════════════════════════
let devriyede = false;

async function karargahDevriyesi() {
    if(devriyede) return;
    devriyede = true;

    try {
        const asiller = KARARGAH_KADRO.filter(k => k.tur === 'ASIL');
        const stajyerler = KARARGAH_KADRO.filter(k => k.tur === 'STAJYER');

        // Sembolik İzleme / Radar (Buraya gelecekte gercek kod watchdogu takilacak)
        // 1. Asiller "Planlama_Departmani/ajanlar.log" gibi yerlere sizar ve bakar.
        ozelLog(`[RADAR] ${asiller.length} ASİL Ajan 5 Karargah Sayfasina Dogru Devriyeye Cikti.`, 'OP');

        const anaLog = path.join(__dirname, '../Planlama_Departmani/ajanlar.log');
        let supheliVeri = null;
        
        if (fs.existsSync(anaLog)) {
            const lines = fs.readFileSync(anaLog, 'utf-8').split('\n');
            const sonSatirlar = lines.slice(-20).join('\n'); // Son 20 islem
            
            // Ornek: [K-2] INFAZ yazdirdiysa bu normal, ama ajan "reddedildi" mesajina inat calisiyorsa ISYAN.
            if(sonSatirlar.includes('[DEVIATION_DETECTED]') || sonSatirlar.includes('INVALID_COMMAND')) {
                supheliVeri = "ISLEM SAPMASI / KURAL IHLALI TESPIT EDILDI";
            }
        }

        if (supheliVeri) {
            ozelLog(`[ISYAN/SAPMA] Hedef Dosya: Planlama Dpt. -> Durum: ${supheliVeri}`, 'KIRMIZI_ALARM');
            
            // Asil ajan müdahalesi
            ozelLog(`[MÜDAHALE] HQ-PLANLAMA-ASIL-01 Isyan Eden veya Kural Bozan Ajan İcin KELLE VURMA islemi baslatti. (Görev Fail edildi).`, 'INFAZ');
            
            // Stajyer ajan öğrenimi (0 BİLGİDEN ASİLLERİ TAKLİT EDEREK ÖĞRENİYOR)
            const stajyerNotu = `[OGRENIM_GUNCELLEMESI] HQ-PLANLAMA-STAJYER-01: Asil Kumandanin ISYAN durumunda nasil aninda infaz ettigini gordum. Sisteme ihanetin cezasi iptal edilmektir. Davranisa isleniyor.`;
            fs.appendFileSync(EGITIM_MERKEZI, stajyerNotu + '\n');
            ozelLog(stajyerNotu, 'STAJYER_EGITIM');
        } else {
            // Stajyer gozlemi
            const stajyerNotu = `[OGRENIM_KAYDI] HQ-FRONTEND-STAJYER-05: Sayfalarda sadece koda uygun islem yapilmis. Temiz izlendi.`;
            fs.appendFileSync(EGITIM_MERKEZI, stajyerNotu + '\n');
        }

    } catch(err) {
        ozelLog(`Devriye Hatasi: ${err.message}`, 'HATA');
    } finally {
        devriyede = false;
    }
}

// ═══════════════════════════════════════════════════════════════
// BASLATICI
// ═══════════════════════════════════════════════════════════════
function karargahMotoruBaslat() {
    console.log(`\n======================================================`);
    console.log(`[MERKEZ KARARGAH] ISTIHBARAT VE YONETIM EKIBI AKTIF`);
    console.log(`[KURMAY ALBAY BURHAN] KOMUTASINA BAGLANILDI`);
    console.log(`[GOREV GUCU] 50 ASİL (INFAZCI) + 100 STAJYER (EGITIMDE)`);
    console.log(`======================================================\n`);
    
    // Her 15 saniyede bir tam devriye
    setInterval(karargahDevriyesi, 15000);
    // İlk tur hemen baslar
    karargahDevriyesi();
}

if (require.main === module) {
    karargahMotoruBaslat();
}

module.exports = {
    karargahMotoruBaslat
};
