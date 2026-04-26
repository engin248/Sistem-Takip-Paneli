/**
 * aiOrchestrator.js — AI Motor Yöneticisi (Orkestratör)
 * Sorumluluk: Motor seçimi, EDK enjeksiyonu, chat() döngüsü.
 * Bağımlılık: ai_motorlar.js, ai_protokol.js
 *
 * MODÜL HATA KODLARI (ORC-xxx — bu modüle özel):
 *   ORC-001 : EDK dosyası bulunamadı (uyarı — sistem durmaz)
 *   ORC-002 : Kadro yüklenemedi (uyarı — kimlik enjeksiyonu devre dışı)
 *   ORC-003 : Ajan bulunamadı — geçersiz ajanId
 *   ORC-004 : Tüm AI motorları yanıt vermedi — engine yok
 *   ORC-005 : EDK protokol uyarısı — 3 denemede format sağlanamadı
 */

const fs   = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { callOllama, callOpenAILocal, callGemini, getEngineForModel } = require('./ai_motorlar');
const { validateProtocol } = require('./ai_protokol');
const { edk25SistemPrompt } = require('./edk_25'); // EDK-25 (121 madde)

// HermAI Üfuk Bloğu — Her AI çağrısında bağlamsal gerçekçilik sağlanır
// Kaynak: Sadi Evren Şeker, YBS Ansiklopedi 2025, İlke 1: Bağlamsal Gerçekçilik
function hermAiUfukBloku(gorevKonu = '') {
    return `
════ HermAI ÜFUK (Bağlamsal Gerçekçilik — YBS Ansiklopedi 2025) ════
Kaynak: Prof. Dr. Sadi Evren Şeker, Cilt 13, Sayı 1, Ocak 2025
İLKE 1 BAĞLAM: İçinde bulunduğun görev/ufuk: "${gorevKonu.substring(0,120)}"
İLKE 2 YORUM: Her kararın arkasında [MİKRO] ve [MAKRO] açıklama zorunlu.
İLKE 3 ERİŞİLEBİLİRLİK: Teknik detayları varsa sade dille de açıkla.
KARA KUTU YASAK: “Neden bu karar?" sorusu cevaplanmalı.
EDK-25.16: Belirsizliği gizleme. EDK-25.20: Halüsinasyon yasak.
═════════════════════════════════════════════`;
}

// ── AJAN KADROSU (Kimlik Enjeksiyonu için) ───────────────────
let _KADRO = null;
try {
    const { TAM_KADRO } = require('../Agent_Uretim_Departmani/roster/index.js');
    _KADRO = TAM_KADRO;
} catch { console.warn('[ORC-002] Kadro yüklenemedi — kimlik enjeksiyonu devre dışı.'); }

class AIOrchestrator {
    constructor() {
        this.geminiModel   = null;
        this.localEngines  = [
            { name: 'Ollama',    host: process.env.OLLAMA_URL || 'http://localhost:11434', type: 'ollama' },
            { name: 'LM-Studio', host: 'http://localhost:1234', type: 'openai-local' },
            { name: 'GPT4All',   host: 'http://localhost:4891', type: 'openai-local' },
        ];
        this.fallbackModel = process.env.OLLAMA_MODEL || 'qwen2.5';
        // Eğer GEMINI API anahtarı varsa öncelikle Gemini kullan (yerel motorların HTML/404 cevapları parse hatası üretiyor)
        if (process.env.GEMINI_API_KEY) {
            this.localEngines = [];
            this.geminiModel = true;
        }
        this.edkYolu       = path.join(__dirname, '../Belgeler/EVRENSEL_DOGRULUK_PROTOKOLU.md');

        if (process.env.GEMINI_API_KEY) {
            this.genAI       = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            this.geminiModel = true; // işaret — callGemini genAI ile çağrılır
        }
    }

    // ── EDK YÜKLE ─────────────────────────────────────────────
    getEDK() {
        if (fs.existsSync(this.edkYolu)) return fs.readFileSync(this.edkYolu, 'utf-8');
        console.warn('[ORC-001] EDK dosyası bulunamadı. Sistem devam ediyor.');
        return 'UYARI: EDK PROTOKOLÜ BULUNAMADI! SADECE MANTIKSAL KESİNLİKLE CEVAP VER.';
    }

    // ── AJAN KİMLİK BLOĞU ─────────────────────────────────────
    ajanKimlikPrompt(ajanId) {
        if (!_KADRO || !ajanId) return '';
        const ajan = _KADRO.find(a => a.id === ajanId);
        if (!ajan) return `[AJAN BULUNAMADI: ${ajanId}] — Kimlik doğrulanamadı.`;

        const rolNo = ajanId.split('-').pop();
        const roller = { '01': 'YAPICI — görevi analiz eder ve plan üretir', '02': 'DENETÇİ — çıktıyı çürütmeye çalışır', '03': 'YEDEK-ALFA', '04': 'YEDEK-BRAVO', '05': 'YEDEK-CHARLIE' };
        const rol    = roller[rolNo] || 'UZMAN';
        const kapsam = ajan.kapsam_siniri?.join(', ')   || 'belirtilmemiş';
        const beceri = ajan.beceriler?.slice(0,8).join(' | ') || 'belirtilmemiş';

        return `
════════════════════════════════════════════════════════
ASKERİ KİMLİK KARTI — MDS-160 ONAYLANDI
════════════════════════════════════════════════════════
[AJAN ID]      : ${ajan.id}   [KOD ADI]: ${ajan.kod_adi}
[TAKIM]        : ${ajan.takim_kodu} — ${ajan.uzmanlik_alani}
[ROL]          : ${rol}
[GÖREV]        : ${ajan.gorev_tanimi}
[BECERİLER]   : ${beceri}
[KAPSAM SINIRI]: ${kapsam}
════════════════════════════════════════════════════════
KURALLAR: Kapsam dışı → [KAPSAM_İHLALİ]. Veri yoksa → VERİ HATTI KESİK.
Sert çıktı formatı: [GÖREV_ÖZETİ] → [ADIMLAR] → [SONUÇ: KABUL/RED] → [KANIT]
════════════════════════════════════════════════════════`;
    }

    // ── CHAT — Ana Giriş Noktası ──────────────────────────────
    async chat(prompt, systemPrompt = '', options = {}) {
        const targetModel = options.model || this.fallbackModel;
        const avoidHost   = options.avoidHost || null;
        const maxRetries  = options.maxRetries || 2;
        let   attempt     = 0;
        let   response;

        // Kimlik + EDK-25 (121 madde) + PDP-44 enjeksiyonu — tüm ajanlar zorunlu
        const kimlikBloku = options.ajanId ? this.ajanKimlikPrompt(options.ajanId) : '';
        const edkMetni    = this.getEDK();
        const edk25Bloku  = edk25SistemPrompt();
        const pdp44Bloku  = `\n──── PDP-44 ────\nHer gorevi 44 madde ile degerlendir: A(Problem) B(Kapsam) C(Beklenen/Gerceklesen) D(Olcum) E(G/S/C) F(Kanit) G(Tekrar)\nSonuc: [PDP44: XX/44 | TAM_TANIMLI/EKSIK_VERI/TAM_BELIRSIZ | AKSIYON]\n───`;
        // HermAI Üfuk — İlke 1: Bağlamsal Gerçekçilik. Her AI çağrısında bağlam söylenir.
        const hermAiBlok  = hermAiUfukBloku(options.gorevKonu || typeof prompt === 'string' ? prompt.substring(0,120) : '');
        const fullSystem  = `${edk25Bloku}\n\n${kimlikBloku ? kimlikBloku + '\n\n' : ''}${pdp44Bloku}\n\n${hermAiBlok}\n\nEK TALIMAT: ${systemPrompt}`;

        while (attempt <= maxRetries) {
            attempt++;
            const engine = await getEngineForModel(this.localEngines, targetModel, avoidHost);

            try {
                if (engine) {
                    const model = engine.mappedModelName || targetModel;
                    if      (engine.type === 'ollama')       response = await callOllama(engine.host, model, prompt, fullSystem, options);
                    else if (engine.type === 'openai-local') response = await callOpenAILocal(engine.host, model, prompt, fullSystem, options);
                } else if (this.genAI) {
                    response = await callGemini(this.genAI, prompt, fullSystem, options);
                }
            } catch (err) {
                console.warn(`[STP-AI] ⚠️ Deneme ${attempt}/${maxRetries+1}: ${err.message}`);
                if (attempt > maxRetries) break;
                continue;
            }

            if (response) {
                const v = validateProtocol(response.content);
                if (v.gecerli) return response;
                console.error(`[STP-AI] 🚫 PROTOKOL İHLALİ (${attempt}): ${v.hata}`);
                prompt = `[SİSTEM UYARISI: ${v.hata}. Kurala uyarak tekrar yanıt ver.]\n\n${prompt}`;
            }

            if (attempt > maxRetries) break;
        }

        // Denemeler tükendi — son yanıtı geçir, exception fırlatma
        if (response) {
            console.warn(`[ORC-005] EDK formatı tam sağlanamadı. Son yanıt geçiriliyor. MikroAdımMotoru denetleyecek.`);
            return response;
        }
        throw new Error(`[ORC-004] STP-AI MOTOR HATASI: Hiçbir motordan yanıt alınamadı.`);
    }

    // Geriye dönük uyumluluk — doğrudan dışarıdan çağrılanlar varsa yönlendir
    validateProtocol(content) { return validateProtocol(content); }
}

module.exports = new AIOrchestrator();
