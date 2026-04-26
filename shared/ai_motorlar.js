/**
 * ai_motorlar.js — Yerel Motor Sürücüleri (Ollama + LM-Studio + Gemini + Pinokio)
 * Sorumluluk: Sadece AI motorlarına HTTP çağrısı yapmak.
 * Bağımlılık: http (built-in), @google/generative-ai
 *
 * MODÜL HATA KODLARI (MOT-xxx — bu modüle özel):
 *   MOT-001 : Ollama yanıt parse hatası — JSON hatalı veya boş
 *   MOT-002 : Ollama API hata döndürdü (parsed.error)
 *   MOT-003 : LM-Studio yanıt parse hatası
 *   MOT-004 : LM-Studio API hata döndürdü
 *   MOT-005 : Gemini API çağrısı başarısız
 *   MOT-006 : Engine bulunamadı — tüm motorlar erişilemez
 *   MOT-007 : Pinokio motoru çalışmıyor — bkz PKM hata kodları
 *
 * PİNOKİO ENTEGRASYON (C:\pinokio\api\*):
 *   Görüntü üretimi : gorselUret('prompt', 'sd-forge'|'automatic1111'|...)
 *   Ses → Metin    : sesDonustur(sesData, 'tr')
 *   LLM sohbet     : open-webui veya oobabooga üzerinden
 *   Motor seçimi   : motorSec('gorsel_uretim') → ['sd-forge', 'automatic1111', ...]
 */

const http = require('http');
const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * callOllama — Ollama API'sine chat isteği gönderir.
 */
async function callOllama(host, model, prompt, systemPrompt, options = {}) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({
            model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user',   content: prompt }
            ],
            stream: false,
            options: {
                temperature: 0,                        // KURAL: SIFIR RASTGELELİK
                num_predict: options.maxTokens || 2000
            }
        });

        const req = http.request(`${host}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type':   'application/json',
                'Content-Length': Buffer.byteLength(body)
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.error) { reject(new Error(`[MOT-002] Ollama API hatası: ${parsed.error}`)); return; }
                    resolve({ content: parsed.message?.content || '', provider: 'ollama', model });
                } catch (e) { reject(new Error(`[MOT-001] Ollama parse hatası: ${e.message}`)); }
            });
        });

        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

/**
 * callOpenAILocal — LM-Studio / GPT4All (OpenAI uyumlu) API.
 */
async function callOpenAILocal(host, model, prompt, systemPrompt, options = {}) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({
            model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user',   content: prompt }
            ],
            temperature: 0,
            max_tokens:  options.maxTokens || 2000,
            stream: false
        });

        const req = http.request(`${host}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type':   'application/json',
                'Content-Length': Buffer.byteLength(body)
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.error) { reject(new Error(`[MOT-004] LM-Studio API hatası: ${parsed.error.message || 'LM Studio Error'}`)); return; }
                    resolve({ content: parsed.choices?.[0]?.message?.content || '', provider: 'lm-studio', model });
                } catch (e) { reject(new Error(`[MOT-003] LM-Studio parse hatası: ${e.message}`)); }
            });
        });

        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

/**
 * callGemini — Google Gemini bulut API.
 * systemInstruction ayrı parametre olarak gönderilir (EDK etkinliği için zorunlu).
 */
async function callGemini(genAI, prompt, systemPrompt, options = {}) {
    const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        systemInstruction: systemPrompt,
    });

    const parts = [];
    if (options.inlineData) parts.push({ inlineData: options.inlineData });
    parts.push({ text: prompt });

    const result = await model.generateContent({
        contents: [{ role: 'user', parts }],
    });

    return {
        content:  result.response.text(),
        provider: 'gemini',
        model:    'gemini-2.5-flash'
    };
}

/**
 * getEngineForModel — Failover: Ollama → LM-Studio → GPT4All
 * @param {Array}  localEngines
 * @param {string} targetModel
 * @param {string|null} avoidHost
 */
async function getEngineForModel(localEngines, targetModel, avoidHost = null) {
    const baseName = targetModel.split(':')[0].toLowerCase();

    for (const engine of localEngines) {
        if (avoidHost && engine.host === avoidHost) continue;

        try {
            if (engine.type === 'ollama') {
                const found = await new Promise((resolve) => {
                    http.get(`${engine.host}/api/tags`, { timeout: 1000 }, (res) => {
                        if (res.statusCode !== 200) return resolve(false);
                        let data = '';
                        res.on('data', chunk => data += chunk);
                        res.on('end', () => {
                            try {
                                const json = JSON.parse(data);
                                const m = json.models.find(m => m.name.includes(baseName));
                                if (m) { engine.mappedModelName = m.name; resolve(engine); }
                                else resolve(false);
                            } catch { resolve(false); }
                        });
                    }).on('error', () => resolve(false));
                });
                if (found) return found;

            } else if (engine.type === 'openai-local') {
                const found = await new Promise((resolve) => {
                    http.get(`${engine.host}/v1/models`, { timeout: 1000 }, (res) => {
                        if (res.statusCode !== 200) return resolve(false);
                        let data = '';
                        res.on('data', chunk => data += chunk);
                        res.on('end', () => {
                            try {
                                const json = JSON.parse(data);
                                const m = json.data.find(m =>
                                    m.id.toLowerCase().includes(baseName) ||
                                    m.id.toLowerCase().replace(/-/g,'').includes(baseName.replace(/-/g,''))
                                );
                                if (m) { engine.mappedModelName = m.id; resolve(engine); }
                                else resolve(false);
                            } catch { resolve(false); }
                        });
                    }).on('error', () => resolve(false));
                });
                if (found) return found;
            }
        } catch { continue; }
    }

    return null;
}

// ── PİNOKİO MOTOR ENTEGRASYONU ──────────────────────────────────
const PINOKIO = require('./pinokio_motorlari');

/**
 * callPinokio — Görüntü üretimi veya ses işleme için Pinokio motoruna istek at.
 * @param {string} gorevTipi  - 'gorsel_uretim' | 'ses_metin' | 'sohbet' vb.
 * @param {object} payload    - { prompt, dil, sesData, ... }
 * @returns {Promise<object>}
 */
async function callPinokio(gorevTipi, payload = {}) {
    const motorSirasi = PINOKIO.motorSec(gorevTipi);

    for (const motorId of motorSirasi) {
        const saglik = await PINOKIO.pinokioSaglikKontrol(motorId);
        if (saglik.durum !== 'CANLI') {
            console.warn(`[MOT-007] Pinokio motoru kapalı: ${motorId} (port ${saglik.port}) — sonrakine geçiliyor`);
            continue;
        }

        try {
            if (gorevTipi === 'ses_metin' || gorevTipi === 'transkripsiyon') {
                return await PINOKIO.sesDonustur(payload.sesData, payload.dil || 'tr');
            }
            if (['gorsel_uretim','txt2img','sanatsal_gorsel','flux_gorsel','urun_fotografu'].includes(gorevTipi)) {
                return await PINOKIO.gorselUret(payload.prompt, motorId, payload);
            }
            // Varsayılan: sağlık OK, motor URL'ini döndür (çağıran direkt kullanır)
            return { durum: 'MOTOR_HAZIR', motorId, api_url: PINOKIO.PINOKIO_MOTORLAR[motorId].api_url };
        } catch (e) {
            console.error(`[MOT-007] ${motorId} hatası: ${e.message} — sonrakine geçiliyor`);
        }
    }

    throw new Error(`[MOT-007] Pinokio: '${gorevTipi}' için tüm motorlar yanıtsız.`);
}

module.exports = {
    callOllama, callOpenAILocal, callGemini, getEngineForModel,
    callPinokio,
    // Pinokio yardımcıları
    pinokioMotorlar:   PINOKIO.PINOKIO_MOTORLAR,
    pinokioSaglik:     PINOKIO.tumMotorlarSaglikKontrol,
    pinokioMotorSec:   PINOKIO.motorSec,
    pinokioRapor:      PINOKIO.motorRaporu,
};
