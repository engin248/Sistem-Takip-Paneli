/**
 * STP AI ORKESTRATÖRÜ - L1/L2 Evrensel Bağlantı Katmanı
 * 
 * Bu modül, Sistem Takip Paneli (STP) içindeki tüm birimlerin (L1, L2, Botlar)
 * hem Gemini (Bulut) hem de Ollama (Lokal) ile konuşabilmesini sağlar.
 * 
 * Doktrin: "Local-First" - Eğer yerel model (Ollama) ayakta ise öncelik onunkidir.
 */

const http = require('http');
const { GoogleGenerativeAI } = require('@google/generative-ai');

class AIOrchestrator {
    constructor() {
        this.geminiModel = null;
        
        // SÜREKLİLİK VE HATA TOLERANSI (Engine Failover) - KARAR 14
        this.localEngines = [
            { name: 'Ollama', host: process.env.OLLAMA_URL || 'http://localhost:11434', type: 'ollama' },
            { name: 'LM-Studio', host: 'http://localhost:1234', type: 'openai-local' },
            { name: 'GPT4All', host: 'http://localhost:4891', type: 'openai-local' }
        ];

        this.fallbackModel = process.env.OLLAMA_MODEL || 'qwen2.5'; // Default Maker

        if (process.env.GEMINI_API_KEY) {
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            this.geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        }
    }

    /**
     * İstenilen Modeli Barındıran ve Aktif Olan Sağlam Motoru Bulur (Universal Smart Routing)
     * KURAL 14: SİSTEM OLLAMA'YA BAĞIMLI DEĞİLDİR. OLLAMA ÇÖKERSE LM STUDIO DEVRALIR.
     */
    async getEngineForModel(targetModel) {
        const baseName = targetModel.split(':')[0].toLowerCase(); // Örn: 'deepseek-r1'
        let selectedEngine = null;

        for (const engine of this.localEngines) {
            try {
                if (engine.type === 'ollama') {
                    const isAlive = await new Promise((resolve) => {
                        http.get(`${engine.host}/api/tags`, { timeout: 1000 }, (res) => {
                            if (res.statusCode !== 200) return resolve(false);
                            let data = '';
                            res.on('data', chunk => data += chunk);
                            res.on('end', () => {
                                try {
                                    const json = JSON.parse(data);
                                    const hasModel = json.models.find(m => m.name.includes(baseName));
                                    if (hasModel) {
                                        engine.mappedModelName = hasModel.name; // Tam Ollama ismi
                                        resolve(engine);
                                    } else resolve(false);
                                } catch(e) { resolve(false); }
                            });
                        }).on('error', () => resolve(false));
                    });
                    if (isAlive) {
                        selectedEngine = isAlive;
                        break; // Ollama'da varsa ve ayaktaysa burayı seç
                    }
                } else if (engine.type === 'openai-local') {
                    // OLLAMA ÇÖKTÜYSE VEYA MODEL YOKSA -> LM STUDIO / GPT4ALL
                    const isAlive = await new Promise((resolve) => {
                        http.get(`${engine.host}/v1/models`, { timeout: 1000 }, (res) => {
                            if (res.statusCode !== 200) return resolve(false);
                            let data = '';
                            res.on('data', chunk => data += chunk);
                            res.on('end', () => {
                                try {
                                    const json = JSON.parse(data);
                                    // LM studio'daki GGUF dosya isimlerinden fuzzy match yapıyoruz
                                    const hasModel = json.data.find(m => m.id.toLowerCase().includes(baseName) || m.id.toLowerCase().replace(/-/g,'').includes(baseName.replace(/-/g,'')));
                                    if (hasModel) {
                                        engine.mappedModelName = hasModel.id; // Tam LM Studio GGUF ismi
                                        resolve(engine);
                                    } else resolve(false);
                                } catch(e) { resolve(false); }
                            });
                        }).on('error', () => resolve(false));
                    });
                    if (isAlive) {
                        selectedEngine = isAlive;
                        break; // LM Studio'da bulundu, onu seç
                    }
                }
            } catch (e) {
                continue; // Bu motor çökmüş, diğerine geç (Failover)
            }
        }
        
        return selectedEngine; 
    }

    /**
     * AI Yanıtı Al (Öncelik: Yerel (Ollama/LM Studio) > Gemini)
     * Options içerisinde 'model' parametresi gönderilirse o modeli kullanır (Trinity için)
     */
    /**
     * AI Yanıtı Al (Öncelik: Yerel (Ollama/LM Studio/GPT4All) > Gemini Bulut)
     * Hiçbiri yoksa sistem durmaz, buluta uçar.
     */
    async chat(prompt, systemPrompt = '', options = {}) {
        const targetModelOriginal = options.model || this.fallbackModel;
        
        // HATA TOLERANSI: Ollama çökmüşse LM Studio'ya yönlenir, o da çökmüşse null döner.
        const activeEngine = await this.getEngineForModel(targetModelOriginal);
        
        if (activeEngine) {
            try {
                // Motor değiştirildiyse (Örn LM Studio'nun asıl GGUF adı) onu kullanır
                const finalModelName = activeEngine.mappedModelName || targetModelOriginal;
                console.log(`[STP-AI] ⚡ [PLATFORM BAGIMSIZ] ${activeEngine.name} Motorunda "${finalModelName}" uyandırıldı.`);
                
                if (activeEngine.type === 'ollama') {
                    return await this.callOllama(activeEngine.host, finalModelName, prompt, systemPrompt, options);
                } else if (activeEngine.type === 'openai-local') {
                    return await this.callOpenAILocal(activeEngine.host, finalModelName, prompt, systemPrompt, options);
                }
            } catch (err) {
                console.warn(`[STP-AI] ⚠️ ${activeEngine.name} çöktü/hata verdi: ${err.message}. İkinci Failover aşamasına geçiliyor!`);
            }
        }

        // Başka Motor Yoksa veya Çöktüyse Gemini'ye Geç (Asla Durma)
        if (this.geminiModel) {
             console.warn(`[STP-AI] ☁️ Yerel motorların TÜMÜ kapalı/hatalı. Acil durum bulut motoru (Gemini) devrede.`);
             return await this.callGemini(prompt, systemPrompt, options);
        }

        throw new Error("STP-AI KILITLENMESI: Hiçbir AI motoru (Lokal veya Bulut) ayakta değil! Lokal IT müdahalesi gerekiyor.");
    }

    async callOllama(host, model, prompt, systemPrompt, options) {
        return new Promise((resolve, reject) => {
            const body = JSON.stringify({
                model: model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: prompt }
                ],
                stream: false,
                options: {
                    temperature: options.temperature || 0.3,
                    num_predict: options.maxTokens || 1000
                }
            });

            const req = http.request(`${host}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(body)
                }
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.error) {
                             reject(new Error(parsed.error));
                             return;
                        }
                        resolve({
                            content: parsed.message ? parsed.message.content : '',
                            provider: 'ollama',
                            model: model
                        });
                    } catch (e) { reject(e); }
                });
            });

            req.on('error', reject);
            req.write(body);
            req.end();
        });
    }

    async callOpenAILocal(host, model, prompt, systemPrompt, options) {
        return new Promise((resolve, reject) => {
            const body = JSON.stringify({
                model: model, // LM Studio'da genelde model ismi ignore edilir ama gönderilir
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: prompt }
                ],
                temperature: options.temperature || 0.3,
                max_tokens: options.maxTokens || 1000,
                stream: false
            });

            const req = http.request(`${host}/v1/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(body)
                }
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.error) {
                             reject(new Error(parsed.error.message || 'LM Studio Error'));
                             return;
                        }
                        resolve({
                            content: parsed.choices && parsed.choices[0] ? parsed.choices[0].message.content : '',
                            provider: 'lm-studio',
                            model: model
                        });
                    } catch (e) { reject(e); }
                });
            });

            req.on('error', reject);
            req.write(body);
            req.end();
        });
    }

    async callGemini(prompt, systemPrompt, options) {
        let content = [];
        if (systemPrompt) content.push({ text: `SİSTEM: ${systemPrompt}` });
        
        if (options.inlineData) {
            content.push({ inlineData: options.inlineData });
        }
        
        content.push({ text: prompt });

        const result = await this.geminiModel.generateContent(content);
        return {
            content: result.response.text(),
            provider: 'gemini',
            model: 'gemini-2.5-flash'
        };
    }
}

module.exports = new AIOrchestrator();
