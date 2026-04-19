/**
 * RETRY HELPER
 * =======================
 * Fail-Fast kuralını esnetmeyen ancak geçici ağ kopmalarında
 * kontrollü 1 tekrar hakkı (max_retries) tanıyan yardımcı sınıf.
 */
'use strict';

async function executeWithRetry(asyncTaskFn, maxRetries = 1) {
    let attempt = 0;
    while (attempt <= maxRetries) {
        try {
            return await asyncTaskFn();
        } catch (error) {
            attempt++;
            if (attempt > maxRetries) {
                error.message = `[GÖREV İPTAL] Maximum deneme aşımı (${maxRetries}). Asıl Hata: ` + error.message;
                throw error;
            }
            // Bekleme ve tekrar (Exponential form yerine sabit 200ms hızlı tekrar)
            await new Promise(res => setTimeout(res, 200));
        }
    }
}

module.exports = { executeWithRetry };
