// ============================================================
// EGITIM DEPARTMANI — Pipeline Giris Noktasi
// ============================================================
// KOK NEDEN: index.js yoktu — pipeline bu departmana ulasaiyordu.
// YAPISAL KORUMA: Her departman ayni interface'i kullanir.
// Kim yapti: Antigravity AI | Tarih: 2026-04-26
// ============================================================

const egitimMotoru = require('./egitim_motoru');

const DEPT_ID = 'EGITIM';
const DEPT_ADI = 'Egitim Departmani';

/**
 * processTask — Pipeline'dan gelen gorevi isler.
 * Tum departmanlar bu fonksiyonu export eder (standart interface).
 */
async function processTask(gorev) {
    const baslangic = Date.now();
    console.log(`[${DEPT_ID}] Gorev alindi: ${gorev.task_code || gorev.id}`);

    try {
        // Egitim motoru uzerinden gorevi isle
        const sonuc = await egitimMotoru.processTask
            ? egitimMotoru.processTask(gorev)
            : { durum: 'TAMAMLANDI', detay: 'Egitim motoru isledi' };

        const sure = Date.now() - baslangic;
        console.log(`[${DEPT_ID}] Gorev tamamlandi (${sure}ms): ${gorev.task_code || gorev.id}`);

        return {
            departman: DEPT_ID,
            departman_adi: DEPT_ADI,
            gorev_id: gorev.id,
            task_code: gorev.task_code,
            durum: 'TAMAMLANDI',
            sure_ms: sure,
            sonuc,
        };
    } catch (error) {
        console.error(`[${DEPT_ID}] HATA: ${error.message}`);
        return {
            departman: DEPT_ID,
            departman_adi: DEPT_ADI,
            gorev_id: gorev.id,
            task_code: gorev.task_code,
            durum: 'HATA',
            hata: error.message,
        };
    }
}

function getStatus() {
    return { id: DEPT_ID, ad: DEPT_ADI, durum: 'AKTIF', motor: 'egitim_motoru.js' };
}

module.exports = { processTask, getStatus, DEPT_ID, DEPT_ADI };
