// ============================================================
// MDS-KARARGAH: MERKEZ YONETIM EKIBI (YUKSEK ISTIHBARAT VE INFAZ)
// ============================================================
// Kurucu: Engin | Kurmay Albay: Burhan
// GOREVI: Her sayfanin (Departmanin) mutlak hakimi olan,
// 10 Asil + 40 Stajyer'den olusan Birlikler.
//
// Bu ekip Sistem-ici siradan API veya Supabase gorevleri almaz!
// Dogrudan Kod Base'i, operasyon sayfasini (React bilesenleri, API route'lari)
// ve diger ajanlarin faaliyetlerini gozetler.
//
// Stajyerler onceden bilgisi olmayan ('Bos Beyin') modundadir.
// ============================================================

const fs = require('fs');
const path = require('path');
const AI = require('../shared/aiOrchestrator'); // Infaz icin

// KARARGAHA BAGLI 10 ANA US (Yazilim + Tekstil Operasyonlari)
const DEPARTMANLAR = [
    // --- 1. YAZILIM VE SISTEM KANADI ---
    { id: 'FRONTEND', ad: 'Frontend UI Sayfalari' },
    { id: 'INTAKE', ad: 'Gorev Kabul (API / WhatsApp)' },
    { id: 'PLANLAMA', ad: 'Planlama Departmani (ArGe / Kurul)' },
    { id: 'VERITABANI', ad: 'Veritabani ve Supabase Memory' },
    { id: 'AGENT_URETIM', ad: 'Agent Uretim ve Disiplin Merkezi' },

    // --- 2. TEKSTIL VE FINANS KANADI (DEV EKIP) ---
    { id: 'TEKSTIL_ARGE', ad: 'Kumas, Iplik ve Materyal Ar-Ge' },
    { id: 'TEKSTIL_TASARIM', ad: 'Model, Koleksiyon ve Stil Tasarimi' },
    { id: 'TEKSTIL_URETIM', ad: 'Kesim, Dikim ve Fason Uretim Takip' },
    { id: 'TEKSTIL_KALITE', ad: 'Kalite Kontrol ve Urun Standartlari' },
    { id: 'TEKSTIL_FINANS', ad: 'Maliyetlendirme, Satis ve Pazar Genislemesi' }
];

const KARARGAH_KADRO = [];

// ═══════════════════════════════════════════════════════════════
// KADRO URETIM MOTORU (10 Asil + 40 Stajyer = 50x5 = 250)
// ═══════════════════════════════════════════════════════════════

for (const dept of DEPARTMANLAR) {
    
    // 10 ASIL AJAN (Tam Yetkili - Sisteme Tam Hakim)
    for (let i = 1; i <= 10; i++) {
        const no = i < 10 ? `0${i}` : `${i}`;
        const ajanId = `HQ-${dept.id}-ASIL-${no}`;
        
        KARARGAH_KADRO.push({
            id: ajanId,
            kod_adi: `[ASİL EMR] ${dept.id} Yöneticisi`,
            departman: dept.id,
            tur: 'ASIL',
            yetki: 'MUTLAK_INFAZ_VE_KONTROL',
            durum: 'GOREVDE',
            doktrin: `Kurucu Emri Doğrultusunda: Bu ajan, atandığı [${dept.id}] sayfasının ve iş akışının MUTLAK SAHİBİ VE HAKİMİDİR. Sadece bilmekle kalmaz, oranın patronudur. Kendi departmanıyla ilgili en üst tekno-dijital katmandır.`,
            istihbarat_rotasi: 'karargah_istihbarat_hatti'
        });
    }

    // 40 STAJYER AJAN (Sifir Bilgi - Gozlemci - Zamanla Ogrenen)
    for (let j = 1; j <= 40; j++) {
        const no = j < 10 ? `0${j}` : `${j}`;
        const stajyerId = `HQ-${dept.id}-STAJYER-${no}`;
        
        KARARGAH_KADRO.push({
            id: stajyerId,
            kod_adi: `[STAJYER] ${dept.id} Gözlemcisi`,
            departman: dept.id,
            tur: 'STAJYER',
            yetki: 'SADECE_IZLE_VE_RAPORLA',
            beyin_durumu: 'ZERO_KNOWLEDGE', // Sifir bos beyin
            durum: 'EGITIMDE',
            doktrin: `Geleceğin Mimar Adayı. [${dept.id}] sayfasının hakimiyetini Asil ajanlardan miras almak üzere sıfırdan eğitilmektedir. Dış kütüphane asla kullanamaz.`,
            istihbarat_rotasi: 'karargah_istihbarat_hatti'
        });
    }
}

// ═══════════════════════════════════════════════════════════════
// IHRAC VE ISTIHBARAT ALANLARI
// ═══════════════════════════════════════════════════════════════

module.exports = {
    DEPARTMANLAR,
    KARARGAH_KADRO
};

// Test
if (require.main === module) {
    console.log(`[HQ] Karargah Birim Motoru Uyanisi: TOPLAM ${KARARGAH_KADRO.length} ASKER`);
    console.log(`[HQ] ORNEK BIRIM:`, KARARGAH_KADRO[0]);
    console.log(`[HQ] ORNEK YENI YETISEN BIRIM:`, KARARGAH_KADRO[11]); 
    console.log(`[HQ] Tüm birlikler dogrudan "Kurmay Albay Burhana" (Sisteme degil, dogrudan Merkeze) baglanmistir.`);
}
