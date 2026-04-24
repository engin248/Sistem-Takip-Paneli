/**
 * NİZAM - GÖREV KABUL (INTAKE) DEPARTMANI
 * Dışarıdan (Ses/Yazı/Panel) gelen ham emirleri sisteme almadan önce:
 * 1. Mimar (DeepSeek) vizyon çizer.
 * 2. Denetçi (Gemma-2/Mistral-Nemo) 100 Maddelik Ana Kırbaçla (Denetçi Protokolü) bunu yargılar.
 * 3. Geçici Bellek Ajanı arka planda öğrenme logu kaydeder.
 */

const fs = require('fs');
const path = require('path');
const AI = require('../shared/aiOrchestrator');
const { DENETIM_ANAYASASI } = require('../Planlama_Departmani/denetim_protokolu');
const { KADRO, TUM_KONU_FIHRISTI } = require('../Planlama_Departmani/kadro_dinamo');

// Geçici Bellek Ajanı Log Dosyası (Evrim / Finetuning verisi için)
const GECICI_LOG_DOSYASI = path.join(__dirname, 'gecici_hafiza.log');

function logGeciciHafiza(mimarPlan, denetimCevabi_val, sonuc) {
    const logData = `[TARİH: ${new Date().toISOString()}]\n--- MİMARIN KODU ---\n${mimarPlan}\n--- DENETÇİ İTİRAZI ---\n${denetimCevabi_val}\n--- SONUÇ ---\n${sonuc}\n========================\n`;
    fs.appendFileSync(GECICI_LOG_DOSYASI, logData);
}

/**
 * Denetçi için 100 Maddelik Dev Metni Birleştirir.
 */
function denetimKriterleriniMetneCevir() {
    let metin = "SENİN KANUNLARIN ŞUNLARDIR (BUNLARA BAKARAK İNFAZ EDECEKSİN):\n";
    for (let key in DENETIM_ANAYASASI) {
        metin += `\n[${key.toUpperCase()}]\n` + DENETIM_ANAYASASI[key].join("\n") + "\n";
    }
    return metin;
}

/**
 * Görev Kabul Sürecinin Ana Ateşleyicisi (Panelden bu fonksiyon çağırılır)
 */
async function komutuSistemeKabulEt(hamEmir) {
    console.log(`\n============ 🏛️ GÖREV KABUL DEPARTMANI (PRE-BOARD) AÇILDI ============`);
    console.log(`[GELEN SİNYAL]: "${hamEmir}"\n`);

    // 1. AŞAMA: MİMAR / TEKSTİL AR-GE ZEKASI (YAPAN) - DeepSeek
    console.log(`[MİMAR/ARGE]: Emir analiz ediliyor...`);
    
    let mimarSistemi = `Sen Mimar (MDS-2026). Kullanıcının ham emrini al. 
Varsayım yapmadan, en iyi kodu ve [Proje Planı, Operasyon Sırası, Etki Alanı, Kontrol Noktaları, Teknoloji] şemasını çıkar. Sessiz Çıktı formatı zorunludur.`;

    if (hamEmir.toLowerCase().includes("analiz") || hamEmir.toLowerCase().includes("tekstil") || hamEmir.toLowerCase().includes("arge")) {
        console.log(`[ÖZEL RADAR]: Tekstil Ar-Ge M1 Simülasyonu (3'lü Zeka) Aktif Edildi.`);
        mimarSistemi = `Sen "Sistem Takip Paneli"nin otonom Tekstil AR-GE yapay zekasısın.
Sana verilen verileri 3 farklı uzmanlık gözüyle analiz etmelisin:
1. ✂️ MODELİST ZEKASI: Beden sorunları, omuz darlığı, esneme payı, iade/defo riski gibi kalıp itirazlarını hesapla.
2. 🎨 BAŞ TASARIMCI ZEKASI: Kumaş kalitesi (pamuk/elastan vb.), renk kıtlığı, 2. yıkama solması gibi doku ve trend analizlerini yap.
3. 💼 BAŞ PAZARLAMACI ZEKASI: Damping (zararına satış), fiyat rekabeti, çapraz satış/kombin vizyonunu hesapla.

ÇIKTI FORMATIN ŞU ŞEKİLDE ZORUNLUDUR:
✂️ [MODELİST] (yorumun)
🎨 [TASARIMCI] (yorumun)
💼 [PAZARLAMACI] (yorumun)
👑 [NİHAİ NİZAM KARARI] (Kesin üretim veya red kararın, kombin detayları). Sadece bu raporu üret, gereksiz cümle kurma.`;
    }
    
    let mimarGorevKodu = "";
    try {
        let aiMimar = await AI.chat(hamEmir, mimarSistemi, { model: 'deepseek-coder-v2:latest' });
        mimarGorevKodu = aiMimar.content || aiMimar;
    } catch(e) {
        console.log(`[HATA - MİMAR]: Motor Çöktü/Kapalı - ${e.message}`);
        mimarGorevKodu = "[MİMAR - ÇEVRİMDIŞI SİMÜLASYON] Varsayılan mimari planı...";
    }

    
    // 2. AŞAMA: DENETÇİ (İTİRAZCI / KONTROL EDEN) - gemma2:9b
    console.log(`[DENETÇİ]: Mimarın planı 100 Maddelik Kırbaç Matrisine (Denetçi Protokolü) sokuluyor...`);
    
    const anayasaMetni = denetimKriterleriniMetneCevir();
    const denetimSistemi = `Sen DENETÇİ ajanıydın (Model: Mistral). Senin görevin 100 MADDELİK ANAYASAYLA Mimarın yazdıklarını infaz etmektir.
    
AŞAĞIDAKİ ANAYASA MADDELERİNDEN BİRİNE BİLE UYMUYORSA VEYA RİSK VARSA CEVABININ BAŞINA "[İNFAZ]" YAZ VE SEBEBİNİ SÖYLE!
EĞER %100 KUSURSUZ İSE SADECE "[PASS]" YAZ.

${anayasaMetni}`;

    let denetimCevabi = "";
    try {
        let aiDenetim = await AI.chat(mimarGorevKodu, denetimSistemi, { model: 'mistral:latest' });
        denetimCevabi = aiDenetim.content || aiDenetim;
    } catch(e) {
        console.log(`[HATA - DENETÇİ]: Motor Çöktü/Kapalı - ${e.message}`);
        denetimCevabi = "[İNFAZ] Motor kapalı. 100 Maddenin taranması için Ollama bağlantısı reddedildi.";
    }

    // 3. AŞAMA: SONUÇ DEĞERLENDİRME VE GECICI_BELLEK KAYDI
    let isPass = denetimCevabi.includes("[PASS]");
    let nihaiDurum = isPass ? "ONAYLANDI (Kurul Masasına Gidiyor)" : "İNFAZ EDİLDİ (Plan Çöktü)";
    
    if (isPass) {
        console.log(`\n✅ ⚔️ [SONUÇ]: Denetçi 100 Kırbacı vurdu ve 100'ünden de geçti! Plan KUSURSUZ.`);
        // TODO: Kurul_Masasi.js'i tetikle veya Panel veritabanına "ONAYLANDI" yaz.
    } else {
        console.log(`\n❌ 🩸 [SONUÇ]: İNFAZ! Denetçi planı paramparça etti.\nDenetçi Raporu:\n${denetimCevabi}`);
    }

    // GECICI_BELLEK ÖĞRENME LOGU
    console.log(`[GECICI_BELLEK AJAN]: İki zekanın kapışması "Öğrenme Logu" (Finetuning) olarak kaydedildi.`);
    logGeciciHafiza(mimarGorevKodu, denetimCevabi, nihaiDurum);

    return {
        durum: isPass ? 'PASS' : 'FAIL',
        mimar_plan: mimarGorevKodu,
        denetim_raporu: denetimCevabi
    };
}

// Terminalden direkt test için
if (require.main === module) {
    const task = process.argv.slice(2).join(' ') || "Telegram'dan gelen mesajları hemen DB'deki logs tablosuna şifresiz kaydedelim.";
    komutuSistemeKabulEt(task);
}

module.exports = { komutuSistemeKabulEt };
