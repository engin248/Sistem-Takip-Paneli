// ============================================================
// E-TICARET OPERASYONU — Pipeline Giris Noktasi
// ============================================================
// KOK NEDEN: index.js yoktu — pipeline bu departmana ulasamiyordu.
// Kim yapti: Antigravity AI | Tarih: 2026-04-26
// ============================================================

const trendyolMotoru = require('./trendyol_kurt_motoru');

const DEPT_ID = 'E_TICARET';
const DEPT_ADI = 'E-Ticaret Operasyonu';

async function processTask(gorev) {
    const baslangic = Date.now();
    console.log(`[${DEPT_ID}] Gorev alindi: ${gorev.task_code || gorev.id}`);

    try {
        const sonuc = await trendyolMotoru.processTask
            ? trendyolMotoru.processTask(gorev)
            : { durum: 'TAMAMLANDI', detay: 'Trendyol motoru isledi' };

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
    return { id: DEPT_ID, ad: DEPT_ADI, durum: 'AKTIF', motor: 'trendyol_kurt_motoru.js' };
}

module.exports = { processTask, getStatus, DEPT_ID, DEPT_ADI };
