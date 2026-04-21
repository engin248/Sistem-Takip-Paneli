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
        this.ollamaConfig = {
            host: process.env.OLLAMA_URL || 'http://localhost:11434',
            model: process.env.OLLAMA_MODEL || 'llama3.1:latest'
        };

        if (process.env.GEMINI_API_KEY) {
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            this.geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        }
    }

    /**
     * Yerel Ollama servisinin ayakta olup olmadığını kontrol eder.
     */
    async isLocalAvailable() {
        return new Promise((resolve) => {
            const req = http.get(`${this.ollamaConfig.host}/api/tags`, { timeout: 1000 }, (res) => {
                resolve(res.statusCode === 200);
            });
            req.on('error', () => resolve(false));
            req.on('timeout', () => { req.destroy(); resolve(false); });
            req.end();
        });
    }

    /**
     * AI Yanıtı Al (Öncelik: Ollama > Gemini)
     */
    async chat(prompt, systemPrompt = '', options = {}) {
        const localMode = await this.isLocalAvailable();
        
        if (localMode) {
            try {
                return await this.callOllama(prompt, systemPrompt, options);
            } catch (err) {
                console.warn(`[STP-AI] Ollama hatası, Gemini'ye fallback yapılıyor: ${err.message}`);
            }
        }

        if (this.geminiModel) {
            return await this.callGemini(prompt, systemPrompt, options);
        }

        throw new Error("STP-AI: Ne yerel (Ollama) ne de bulut (Gemini) AI servisi mevcut değil!");
    }

    async callOllama(prompt, systemPrompt, options) {
        return new Promise((resolve, reject) => {
            const body = JSON.stringify({
                model: this.ollamaConfig.model,
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

            const req = http.request(`${this.ollamaConfig.host}/api/chat`, {
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
                            model: this.ollamaConfig.model
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
