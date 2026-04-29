/**
 * GÖREV KABUL (INTAKE) DEPARTMANI
 * Dışarıdan (Ses/Yazı/Panel) gelen ham emirleri sisteme almadan önce:
 * 1. F-016: Girdi kalite kontrolü (GIGO filtresi)
 * 2. Mimar (DeepSeek) vizyon çizer.
 * 3. Denetçi (Mistral) 100 Maddelik Ana Kırbaçla (Denetçi Protokolü) bunu yargılar.
 * 4. Geçici Bellek Ajanı arka planda öğrenme logu kaydeder.
 */

const fs   = require('fs');
const path = require('path');
const AI   = require('../shared/aiOrchestrator');
const { TAM_KADRO: KADRO, TAKIM_KODLARI: TUM_KONU_FIHRISTI } = require('../Agent_Uretim_Departmani/roster/index.js');
const { KURALLAR: DENETIM_ANAYASASI, kuralKontrol, ihlalLog } = require('../shared/sistemKurallari');
const { pdp44Rapor } = require('../shared/pdp_44');
const { hermAiTekKarar, baglamOlustur } = require('../shared/hermai_mimarisi'); // HermAI — Sadi Evren Şeker YBS 2025

// EVRENSEL DOĞRULUK PROTOKOLÜ (EDK) YÜKLEYİCİ
const EDK_DOSYASI = path.join(__dirname, '../Belgeler/EVRENSEL_DOGRULUK_PROTOKOLU.md');
function edkAnayasasiniOku() {
    if (fs.existsSync(EDK_DOSYASI)) {
        return fs.readFileSync(EDK_DOSYASI, 'utf-8');
    }
    return "KOMUTAN EMRİ: DOĞRULUK PROTOKOLÜ BULUNAMADI! İŞLEMİ DURDUR!";
}

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
    DENETIM_ANAYASASI.forEach((kural) => {
        metin += `\n[${kural.no}] [${kural.kategori}] ${kural.kural}: ${kural.aciklama} → İHLAL: ${kural.ihlal}\n`;
    });
    return metin;
}

/**
 * Görev Kabul Sürecinin Ana Ateşleyicisi (Panelden bu fonksiyon çağırılır)
 */
async function komutuSistemeKabulEt(hamEmir) {
    console.log(`\n============ 🏛️ GÖREV KABUL DEPARTMANI (PRE-BOARD) AÇILDI ============`);
    console.log(`[GELEN SİNYAL]: "${hamEmir}"\n`);

    // ═══════════════════════════════════════════════════════════
    // F-016: GİRİŞ KALİTE KONTROL (GIGO — 20 Faz Protokolü)
    // hamEmir sisteme girmeden önce kuralKontrol filtresi çalışır.
    // ═══════════════════════════════════════════════════════════
    const girisKontrol = kuralKontrol('KOMUT_ALIM', hamEmir);
    if (!girisKontrol.gecti) {
        const logMsg = ihlalLog('KOMUT_ALIM', girisKontrol);
        if (logMsg) console.log(logMsg);
        console.log(`\n🚫 F-016 GİRİŞ ENGELİ: ${girisKontrol.ihlaller.map(i => `[${i.kural_no}] ${i.aciklama}`).join(' | ')}`);
        return {
            durum: 'FAIL',
            mimar_plan: 'RED',
            denetim_raporu: `[F-016/GIGO] Girdi kalite filtresi başarısız: ${girisKontrol.ihlaller.map(i => i.aciklama).join(', ')}`
        };
    }

    // ═══════════════════════════════════════════════════════════
    // PDP-44: PROBLEM TANIMI PROTOKOLÜ TARAMASI
    // 44 maddelik standart — MDS-160 Kural F-044
    // ═══════════════════════════════════════════════════════════
    const pdp44Sonuc = pdp44Rapor(hamEmir);
    console.log(`[PDP-44] Puan: ${pdp44Sonuc.pdp44_puan} | Durum: ${pdp44Sonuc.durum}`);
    if (pdp44Sonuc.eksik_maddeler.length > 0) {
        console.log(`[PDP-44] Zorunlu eksikler: ${pdp44Sonuc.eksik_maddeler.slice(0,5).join(' | ')}`);
    }
    if (pdp44Sonuc.durum === 'TAM_BELIRSIZ') {
        return {
            durum: 'FAIL',
            mimar_plan: 'RED',
            pdp44: pdp44Sonuc,
            denetim_raporu: `[PDP-44/TAM_BELİRSİZ] Problem tanımı yetersiz. Eksik zorunlu maddeler: ${pdp44Sonuc.eksik_maddeler.slice(0,8).join(', ')}`
        };
    }
    if (pdp44Sonuc.durum === 'EKSİK_VERİ') {
        console.log(`[PDP-44] ⚠️ EKSİK_VERİ — devam ediliyor ama mimar uyarılıyor.`);
    }

    // ════════════════════════════════════════════════════
    // HermAI İLKE 1: BAĞLAMSAL GERÇEKÇİLİK
    // Görev sisteme girmeden önce "ufuk" oluşturulur.
    // Kaynak: Sadi Evren Şeker, YBS Ansiklopedi Cilt 13, 2025
    // ════════════════════════════════════════════════════
    const hermAiBaglam = baglamOlustur({ content: hamEmir }, 'Gorev_Kabul_Departmani', []);
    console.log(`[HermAI] Üfuk oluşturuldu | Bağlam: "${hamEmir.substring(0, 60)}..."`);

    // 1. AŞAMA: MİMAR / TEKSTİL AR-GE ZEKASI (YAPAN) - DeepSeek
    console.log(`[MİMAR/ARGE]: Emir analiz ediliyor...`);
    
    const edkMetni = edkAnayasasiniOku();
    let mimarSistemi = `Sen Mimar (MDS-2026).
AŞAĞIDAKİ EVRENSEL DOĞRULUK PROTOKOLÜ (EDK) SENİN ANAYASANDIR. İHLALİ İNFAZ SEBEBİDİR:
${edkMetni}

[HermAI İLKE 1] BAĞLAM: İçinde bulunduğun görev ufku: "${hamEmir.substring(0,120)}"
[HermAI İLKE 2] Her karar çıktısında [MİKRO] ve [MAKRO] açıklama zorunlu.
[HermAI İLKE 3] Teknik detayları varsa sade dille de açıkla. Kara kutu yasak.
Kaynak: Prof. Dr. Sadi Evren Şeker, YBS Ansiklopedi Cilt 13, Sayı 1, Ocak 2025

Kullanıcının ham emrini al. 
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
        // HATA #20 DÜZELTİLDİ: Model adı .env'den al, hardcoded değil
        const mimarModel = process.env.MIMAR_MODEL || 'deepseek-coder-v2:latest';
        let aiMimar = await AI.chat(hamEmir, mimarSistemi, { model: mimarModel });
        mimarGorevKodu = aiMimar.content || aiMimar;
    } catch(e) {
        console.log(`[HATA - MİMAR]: Motor Çöktü/Kapalı - ${e.message}`);
        // D-002 / F-011 DÜZELTİLDİ: Önceden "Varsayılan mimari planı..." yazıyordu.
        // Bu bir hallsinasyon / uydurma. Sistem "yeterli" çıktı üretemez.
        // F-011: VERİ HATTI KESİK — dur ve raporla.
        return {
            durum: 'FAIL',
            mimar_plan: 'VERİ HATTI KESİK',
            denetim_raporu: `[MİMAR MOTORU KAPALI] ${e.message} — F-011: Sistem durduruluyor.`
        };
    }

    
    // 2. AŞAMA: DENETÇİ (İTİRAZCI / KONTROL EDEN) - Mistral
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
