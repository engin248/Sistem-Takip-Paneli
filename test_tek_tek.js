'use strict';
const path = require('path');
const fs = require('fs');

console.log('══════════════════════════════════════════════════════════════');
console.log('   STP BİRİM-BİRİM (TEK TEK) TAM KONTROL TESTİ');
console.log('══════════════════════════════════════════════════════════════\n');

let failedTest = 0;
let passedTest = 0;

function runTest(name, fn) {
    try {
        const result = fn();
        if (result !== true) throw new Error('Beklenmeyen sonuç döndü');
        console.log(`✅ [GECTI] ${name}`);
        passedTest++;
    } catch (e) {
        console.log(`❌ [HATA ] ${name} -> ${e.message}`);
        failedTest++;
    }
}

async function runAsyncTest(name, fn) {
    try {
        const result = await fn();
        if (result !== true) throw new Error('Beklenmeyen sonuç döndü');
        console.log(`✅ [GECTI] ${name}`);
        passedTest++;
    } catch (e) {
        console.log(`❌ [HATA ] ${name} -> ${e.message}`);
        failedTest++;
    }
}

(async () => {
    // =================================================================
    // 1. EDK-25 Filtreleme Testi
    // =================================================================
    console.log('--- EDK-25 GÜVENLİK FİLTRELERİ ---');
    const { edk25CiktiTara } = require('./shared/edk_25.js');
    runTest('EDK-25 Yasaklı Kavram Algılama (kesinlikle doğru kelimesi)', () => {
        const g = edk25CiktiTara("Bu sistem kesinlikle doğru çalışmaktadır.");
        return g.gecerli === false && g.ihlaller.length > 0;
    });

    runTest('EDK-25 Temiz Çıktı Geçişi', () => {
        const g = edk25CiktiTara("Bu sistemin güvenlik analizleri yapılmıştır.");
        return g.gecerli === true;
    });


    // =================================================================
    // 2. 15 ALGORİTMANIN TEK TEK TESTİ
    // =================================================================
    console.log('\n--- 15 KARAR ALGORİTMASI TEK TEK BİRİM TESTİ ---');
    const alg = require('./Planlama_Departmani/algoritma_merkezi.js');
    
    runTest('A01_gorevGirisFiltesi - Kısa metin reddi', () => {
        return alg.A01_gorevGirisFiltesi("kısa").sonuc === 'FAIL';
    });

    runTest('A02_g2Rotalama - Veritabanı anahtar kelimesi -> VM', () => {
        // Karar sonuc formati dogrudan objeye yazilir
        return alg.A02_g2Rotalama("Veritabanı tablolarını düzelt").takim === 'VM';
    });

    runTest('A03_alanBagimsizlik - Uzmanlık uyuşmadığında 0 Puan', () => {
        return alg.A03_alanBagimsizlik("A1", "Tıp Hukuku", "Sql veri yazma").sonuc === 'FAIL';
    });

    runTest('A04_alternatisSayisiKontrol - Yetersiz', () => {
        return alg.A04_alternatisSayisiKontrol(1).sonuc === 'FAIL';
    });

    runTest('A05_tezAntitezDenge - Dengeli', () => {
        return alg.A05_tezAntitezDenge(80, 85).sonuc === 'PASS';
    });

    runTest('A06_hakemPuanlama - Başarılı ortalama', () => {
        return alg.A06_hakemPuanlama([80, 90, 70]).sonuc === 'PASS';
    });

    runTest('A07_agirlikliSentez - Ağırlıklı hesaplama', () => {
        return alg.A07_agirlikliSentez([{puan: 80, agirlik: 1}]).sonuc === 'PASS';
    });

    runTest('A08_projekPlaniDogrula - Eksik alan', () => {
        return alg.A08_projekPlaniDogrula({hedef: "h"}).sonuc === 'FAIL';
    });

    runTest('A09_teknolojiSecimMatrisi - Boş seçim', () => {
        return alg.A09_teknolojiSecimMatrisi(null).sonuc === 'FAIL';
    });

    runTest('A10_operasyonPlanUyum - Eksik fazlar', () => {
        return alg.A10_operasyonPlanUyum({}, "hedef").sonuc === 'FAIL';
    });

    runTest('A11_sapmaDetektoru - Sapma yok', () => {
        return alg.A11_sapmaDetektoru(true, []).sonuc === 'PASS';
    });

    runTest('A12_bagimsizDogrulama - Güven puanı 80', () => {
        return alg.A12_bagimsizDogrulama(80, true).sonuc === 'PASS';
    });

    runTest('A13_uzmanPanelToplayici - İnsan Onayı Beklentisi', () => {
        return alg.A13_uzmanPanelToplayici({final_karar: 'INSAN_ONAYI_GEREKLI'}).sonuc === 'BEKLE';
    });

    runTest('A14_finalOnayKapisi - Çoğu kapı fail ise RED', () => {
        return alg.A14_finalOnayKapisi({a01:{sonuc:'FAIL'}}).sonuc === 'FAIL';
    });

    runTest('A15_auditIzYazici - Format uyumu', () => {
        return alg.A15_auditIzYazici(1, "TSK1", {}).sonuc === 'PASS';
    });


    // =================================================================
    // 3. HABERLEŞME KÖPRÜSÜ (BİRİM)
    // =================================================================
    console.log('\n--- HABERLEŞME TOPOLOJİSİ VE FONKSİYONLARI ---');
    const hbk = require('./shared/haberlesme_koprusu.js');
    
    await runAsyncTest('Haberleşme: Boş Mesaj Engelleme', async () => {
        try {
            await hbk.haberlesGonder("");
            return false;
        } catch(e) {
            return e.message.includes('HBK-005');
        }
    });

    await runAsyncTest('Haberleşme: Kanal Yapısı Kontrol', async () => {
        const durum = await hbk.kanalSaglikKontrol();
        return durum.topoloji.DIS_HAT === 'whatsapp' && durum.topoloji.IC_HAT_2 === 'email';
    });


    // =================================================================
    // 4. MİKRO ADIM MOTORU TEKİL ÇALIŞMA
    // =================================================================
    console.log('\n--- MİKRO ADIM MOTORU ---');
    const { MikroAdimMotoru, adimOlustur } = require('./shared/mikroAdimMotoru.js');
    
    await runAsyncTest('MikroAdimMotoru - Bellek Üzerinde DB Olmadan Adım İşleme', async () => {
        // mock chainable supabase
        const mockSupabase = {
            from: () => {
                const query = {
                    update: () => query,
                    eq: async () => ({ error: null }),
                    insert: async () => ({ error: null })
                };
                return query;
            }
        };
        const adim = adimOlustur(1, 'TEST', 'test', async () => ({ gecti: true, cikti: { msj: 'ok' } }));
        const m = new MikroAdimMotoru(99, 'TestG', [adim], mockSupabase);
        const snc = await m.calistir();
        return snc.durum === 'onay_bekliyor';
    });

    console.log('\n══════════════════════════════════════════════════════════════');
    if (failedTest > 0) {
        console.log(`❌ TEST BAŞARISIZ! ${failedTest} hata, ${passedTest} geçti.`);
        process.exit(1);
    } else {
        console.log(` 🏆 BÜTÜN BİRİMLER TEK TEK OLUMLU GEÇTİ (${passedTest}/${passedTest})`);
        process.exit(0);
    }
})();
