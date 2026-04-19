const { hat2, hat3 } = require('./hat1_connection');
const { getPath } = require('./adapter_utils');
const { suggestMapping } = require('./llm_poc');

function normalizeKey(s) {
    if (!s && s !== 0) return '';
    return s.toString().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9]+/g, '');
}
// NOT: Burası ilerleyen aşamada Ollama/GPT gibi AI modüllerine bağlanacak
const SmartAdapterEngine = {

    // 1. STRATEJİK OKUMA (Extraction)
    // mission: { missionId, targetUrl, targetFields: [..], sampleRecord?, silent? }
    async readTarget(mission) {
        const { targetUrl, targetFields, missionId, sampleRecord, silent } = mission;

        if (!silent) console.log(`\x1b[36m[MOTOR]\x1b[0m ${missionId} için Okuma Başladı: ${targetUrl}`);

        // Hat 2'ye (LOG) operasyonun başladığını bildiriyoruz
        if (!silent) hat2.lpush('LOG_LINE', { missionId, status: 'OKUMA_BASLADI', info: `${(targetFields||[]).length} kriter aranıyor.` });

        try {
            // ÖNEMLİ: Bu kısım sadece belirlenen "targetFields" içeriğini parse eder.
            // Eğer sampleRecord verilmişse, ondan doğrudan anahtarlar aranır.
            const extractedData = {};

            // synonyms map for common Turkish field names
            const synonyms = {
                'fiyat': ['price', 'fiyat', 'cost', 'amount', 'price_tl', 'price_usd'],
                'kumaş bilgisi': ['fabric', 'material', 'kumas', 'kumaş', 'fabricType']
            };

            for (const field of (targetFields || [])) {
                let value = null;
                let confidence = 0;
                if (sampleRecord && typeof sampleRecord === 'object') {
                    // try exact key
                    if (sampleRecord[field] !== undefined && sampleRecord[field] !== null) {
                        value = sampleRecord[field];
                        confidence = 0.99;
                    }
                    // try synonyms from persistent store
                    if (value == null) {
                        const cand = require('./adapter_utils').getSynonymsFor(field) || [];
                        for (const k of cand) {
                            const v = getPath(sampleRecord, k);
                            if (v !== undefined && v !== null) { value = v; confidence = 0.95; break; }
                        }
                    }
                    // as a fallback, search shallow keys by name contain
                    if (value == null) {
                        for (const k of Object.keys(sampleRecord)) {
                            if (k.toLowerCase().includes(field.toString().toLowerCase().replace(/\s+/g, ''))) {
                                value = sampleRecord[k]; confidence = 0.6; break;
                            }
                        }
                    }

                    // try LLM PoC to suggest mapping when still null or low confidence
                    if (value == null || confidence < 0.7) {
                        const guess = suggestMapping(field, sampleRecord);
                        if (guess && guess.suggested && guess.confidence > 0.4) {
                            // if PoC returned a sampleKey explicitly, use it
                            if (guess.sampleKey && sampleRecord[guess.sampleKey] !== undefined) {
                                value = sampleRecord[guess.sampleKey]; confidence = guess.confidence; }
                            // otherwise, try suggested key name variants
                            if (value == null) {
                                const variants = [guess.suggested, guess.suggested.toLowerCase(), guess.suggested.replace(/\s+/g, ''), guess.suggested.toLowerCase().replace(/\s+/g, '')];
                                for (const vkey of variants) {
                                    if (sampleRecord[vkey] !== undefined && sampleRecord[vkey] != null) { value = sampleRecord[vkey]; confidence = guess.confidence; break; }
                                }
                            }
                            // try normalized match against sample keys
                            if (value == null) {
                                const targetNorm = normalizeKey(guess.suggested);
                                for (const k of Object.keys(sampleRecord)) {
                                    if (normalizeKey(k) === targetNorm) { value = sampleRecord[k]; confidence = guess.confidence; break; }
                                }
                            }
                            if (!silent && value != null) console.log(`\x1b[33m[MOTOR]\x1b[0m Otomatik öneri: '${field}' -> '${guess.suggested}' (güven: ${Math.round(guess.confidence*100)}%)`);
                        }
                    }
                }
                // final fallback: placeholder
                if (value == null) { value = null; confidence = 0; }
                const review = confidence < 0.7;
                extractedData[field] = { value, confidence, review, status: review ? 'ONAY_BEKLIYOR' : 'OK' };
            }

            // 2. RAPORLAMA (Hat 3'e Teslimat)
            const finalReport = {
                missionId,
                timestamp: new Date().toISOString(),
                source: targetUrl,
                data: extractedData,
                status: 'BASARILI'
            };

            hat3.lpush('DATA_LINE', JSON.stringify(finalReport));
            if (!silent) console.log(`\x1b[32m[MOTOR]\x1b[0m Okuma Tamamlandı. Rapor Hat 3'e İletildi.`);

        } catch (error) {
            hat2.lpush('LOG_LINE', { missionId, status: 'HATA', error: error.message });
        }
    }
};

module.exports = SmartAdapterEngine;
