/**
 * pinokio_motorlari.js — Pinokio Yerel AI Uygulamaları Motor Entegrasyonu
 * =========================================================================
 * Sorumluluk: C:\pinokio\api altındaki 8 uygulamayı STP motor sistemine bağlar.
 * Her Pinokio uygulaması bir HTTP endpoint olarak kayıtlıdır.
 * Agent'lar göreve göre doğru Pinokio motoruna yönlendirilir.
 *
 * Pinokio uygulamaları RUN edildiğinde localhost'ta port açarlar.
 * Bu modül o portlara istek atar ve cevabı standart STP formatına çevirir.
 *
 * MODÜL HATA KODLARI (PKM-xxx):
 *   PKM-001 : Pinokio motoru çalışmıyor (port kapalı)
 *   PKM-002 : API isteği başarısız
 *   PKM-003 : Desteklenmeyen görev tipi
 *   PKM-004 : Model yanıt süresi aşıldı
 *   PKM-005 : Görüntü üretim hatası
 *   PKM-006 : Ses işleme hatası
 */

'use strict';

// ──────────────────────────────────────────────────────────────────
// PİNOKİO UYGULAMA TANIMI
// Her uygulama: port, sağlık URL'i, API endpoint, görev tipleri
// ──────────────────────────────────────────────────────────────────
const PINOKIO_MOTORLAR = {

  // 1. OPEN WEBUI — Ollama'ya web arayüzü / OpenAI uyumlu API
  'open-webui': {
    isim:        'Open WebUI',
    pinokio_yol: 'C:\\pinokio\\api\\open-webui.git',
    port:        3000,
    saglik_url:  'http://localhost:3000/health',
    api_url:     'http://localhost:3000/api/chat/completions',
    api_format:  'openai',
    gorev_tipleri: ['sohbet', 'soru_cevap', 'metin_uretimi', 'analiz'],
    desteklenen_modeller: ['ollama/*'],  // tüm Ollama modelleri
    aciklama: 'Ollama için web arayüzü + OpenAI uyumlu API',
  },

  // 2. AUTOMATIC1111 — Standart Stable Diffusion
  'automatic1111': {
    isim:        'AUTOMATIC1111 Stable Diffusion',
    pinokio_yol: 'C:\\pinokio\\api\\automatic1111.pinokio.git',
    port:        7860,
    saglik_url:  'http://localhost:7860/sdapi/v1/sd-models',
    api_url:     'http://localhost:7860/sdapi/v1/txt2img',
    api_format:  'a1111',
    gorev_tipleri: ['gorsel_uretim', 'txt2img', 'img2img', 'urun_fotografu'],
    desteklenen_modeller: ['sd-1.5', 'sdxl', 'flux'],
    aciklama: 'Tam özellikli Stable Diffusion WebUI',
  },

  // 3. COMFYUI — Gelişmiş görüntü pipeline
  'comfyui': {
    isim:        'ComfyUI',
    pinokio_yol: 'C:\\pinokio\\api\\comfy.git',
    port:        8188,
    saglik_url:  'http://localhost:8188/system_stats',
    api_url:     'http://localhost:8188/api/prompt',
    api_format:  'comfy',
    gorev_tipleri: ['gorsel_pipeline', 'ileri_gorsel', 'workflow', 'inpainting'],
    desteklenen_modeller: ['sd-1.5', 'sdxl', 'flux', 'controlnet'],
    aciklama: 'Node tabanlı görsel AI pipeline yöneticisi',
  },

  // 4. WHISPER WEBUI — Ses → Metin
  'whisper-webui': {
    isim:        'Whisper WebUI',
    pinokio_yol: 'C:\\pinokio\\api\\whisper-webui.git',
    port:        7865,
    saglik_url:  'http://localhost:7865/',
    api_url:     'http://localhost:7865/api/predict',
    api_format:  'gradio',
    gorev_tipleri: ['ses_metin', 'transkripsiyon', 'whatsapp_ses', 'altyazi'],
    desteklenen_modeller: ['whisper-large-v3', 'whisper-medium', 'whisper-small'],
    aciklama: 'OpenAI Whisper tabanlı Türkçe/çok dilli ses tanıma',
  },

  // 5. RVC — Ses klonlama ve dönüştürme
  'rvc': {
    isim:        'RVC (Retrieval-based Voice Conversion)',
    pinokio_yol: 'C:\\pinokio\\api\\rvc.pinokio.git',
    port:        7861,
    saglik_url:  'http://localhost:7861/',
    api_url:     'http://localhost:7861/api/predict',
    api_format:  'gradio',
    gorev_tipleri: ['ses_klonlama', 'tts', 'ses_donusturme', 'sesli_asistan'],
    desteklenen_modeller: ['rvc-v2'],
    aciklama: 'Ses klonlama ve dönüştürme — sesli asistan için',
  },

  // 6. OOBABOOGA — LLM sohbet arayüzü + API
  'oobabooga': {
    isim:        'Text Generation WebUI (Oobabooga)',
    pinokio_yol: 'C:\\pinokio\\api\\oobabooga.pinokio.git',
    port:        5000,
    saglik_url:  'http://localhost:5000/api/v1/model',
    api_url:     'http://localhost:5000/api/v1/chat/completions',
    api_format:  'openai',
    gorev_tipleri: ['llm_sohbet', 'metin_uretimi', 'karakter_bot', 'gguf'],
    desteklenen_modeller: ['llama', 'mistral', 'gemma', 'gguf/*'],
    aciklama: 'GGUF model yükleme + OpenAI uyumlu chat API',
  },

  // 7. INVOKEAI — Stable Diffusion sanatsal
  'invokeai': {
    isim:        'InvokeAI',
    pinokio_yol: 'C:\\pinokio\\api\\invokeai.pinokio.git',
    port:        9090,
    saglik_url:  'http://localhost:9090/api/v1/app/version',
    api_url:     'http://localhost:9090/api/v1/images/generate',
    api_format:  'invokeai',
    gorev_tipleri: ['sanatsal_gorsel', 'urun_gorseli', 'konsept_sanat', 'inpaint'],
    desteklenen_modeller: ['sd-1.5', 'sdxl'],
    aciklama: 'Profesyonel Stable Diffusion — sanatsal görseller',
  },

  // 8. SD FORGE — Hızlı, RTX optimize
  'sd-forge': {
    isim:        'Stable Diffusion Forge',
    pinokio_yol: 'C:\\pinokio\\api\\stable-diffusion-webui-forge.git',
    port:        7862,
    saglik_url:  'http://localhost:7862/sdapi/v1/sd-models',
    api_url:     'http://localhost:7862/sdapi/v1/txt2img',
    api_format:  'a1111',
    gorev_tipleri: ['hizli_gorsel', 'flux_gorsel', 'rtx_optimize'],
    desteklenen_modeller: ['flux', 'sdxl', 'sd-1.5'],
    aciklama: 'RTX 5080 optimize — Flux + SDXL en hızlı seçenek',
  },
};

// ──────────────────────────────────────────────────────────────────
// GÖREV TİPİ → MOTOR EŞLEŞTİRMESİ
// Hangi görev tipi hangi Pinokio motoruna yönlendirilir
// ──────────────────────────────────────────────────────────────────
const GOREV_MOTOR_ESLESTIRME = {
  // Görüntü üretimi → önce Forge (RTX optimize), yedek A1111, yedek InvokeAI
  'gorsel_uretim':    ['sd-forge', 'automatic1111', 'invokeai'],
  'txt2img':          ['sd-forge', 'automatic1111', 'comfyui'],
  'urun_fotografu':   ['automatic1111', 'sd-forge', 'invokeai'],
  'sanatsal_gorsel':  ['invokeai', 'sd-forge', 'automatic1111'],
  'flux_gorsel':      ['sd-forge', 'comfyui', 'automatic1111'],
  'gorsel_pipeline':  ['comfyui', 'sd-forge', 'automatic1111'],

  // Ses işleme
  'ses_metin':        ['whisper-webui'],
  'transkripsiyon':   ['whisper-webui'],
  'whatsapp_ses':     ['whisper-webui'],
  'ses_klonlama':     ['rvc'],
  'tts':              ['rvc'],
  'sesli_asistan':    ['rvc', 'whisper-webui'],

  // Metin/LLM
  'sohbet':           ['open-webui', 'oobabooga'],
  'llm_sohbet':       ['oobabooga', 'open-webui'],
  'metin_uretimi':    ['open-webui', 'oobabooga'],
  'analiz':           ['open-webui', 'oobabooga'],
  'karakter_bot':     ['oobabooga', 'open-webui'],
};

// ──────────────────────────────────────────────────────────────────
// SAĞLIK KONTROLÜ
// ──────────────────────────────────────────────────────────────────
async function pinokioSaglikKontrol(motorId) {
  const motor = PINOKIO_MOTORLAR[motorId];
  if (!motor) return { durum: 'BULUNAMADI', motorId };

  try {
    const ctrl = new AbortController();
    const zamanAsimi = setTimeout(() => ctrl.abort(), 3000);
    const cevap = await fetch(motor.saglik_url, { signal: ctrl.signal });
    clearTimeout(zamanAsimi);
    return { durum: cevap.ok ? 'CANLI' : 'HATA', motorId, isim: motor.isim, port: motor.port };
  } catch {
    return { durum: 'KAPALI', motorId, isim: motor.isim, port: motor.port };
  }
}

async function tumMotorlarSaglikKontrol() {
  const sonuclar = await Promise.all(Object.keys(PINOKIO_MOTORLAR).map(pinokioSaglikKontrol));
  return sonuclar;
}

// ──────────────────────────────────────────────────────────────────
// GÖRÜNTÜ ÜRET — txt2img (A1111 / Forge formatı)
// ──────────────────────────────────────────────────────────────────
async function gorselUret(prompt, motorId = 'sd-forge', seçenekler = {}) {
  const motor = PINOKIO_MOTORLAR[motorId];
  if (!motor) throw new Error(`[PKM-003] Bilinmeyen motor: ${motorId}`);

  const istek = {
    prompt:            prompt,
    negative_prompt:   seçenekler.negatif || 'blurry, bad quality, watermark',
    steps:             seçenekler.adim    || 20,
    cfg_scale:         seçenekler.cfg     || 7,
    width:             seçenekler.genislik || 512,
    height:            seçenekler.yukseklik || 512,
    sampler_name:      seçenekler.sampler  || 'DPM++ 2M',
    seed:              seçenekler.tohum    || -1,
  };

  try {
    const ctrl = new AbortController();
    const zamanAsimi = setTimeout(() => ctrl.abort(), 120000); // 2 dk
    const cevap = await fetch(motor.api_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(istek),
      signal: ctrl.signal,
    });
    clearTimeout(zamanAsimi);

    if (!cevap.ok) throw new Error(`[PKM-002] HTTP ${cevap.status}: ${await cevap.text()}`);
    const data = await cevap.json();
    return {
      durum:   'TAMAM',
      motor:   motorId,
      gorsel:  data.images?.[0] || null, // base64
      bilgi:   data.info        || null,
    };
  } catch (e) {
    if (e.name === 'AbortError') throw new Error(`[PKM-004] Zaman aşımı: ${motorId}`);
    throw new Error(`[PKM-005] Görüntü üretim hatası [${motorId}]: ${e.message}`);
  }
}

// ──────────────────────────────────────────────────────────────────
// SES → METİN (Whisper — Gradio formatı)
// ──────────────────────────────────────────────────────────────────
async function sesDonustur(sesData, dil = 'tr') {
  const motor = PINOKIO_MOTORLAR['whisper-webui'];

  try {
    const ctrl = new AbortController();
    const zamanAsimi = setTimeout(() => ctrl.abort(), 60000);
    const cevap = await fetch(motor.api_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: [sesData, dil, false, false] }),
      signal: ctrl.signal,
    });
    clearTimeout(zamanAsimi);

    const data = await cevap.json();
    return { durum: 'TAMAM', metin: data.data?.[0] || '' };
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('[PKM-004] Ses işleme zaman aşımı');
    throw new Error(`[PKM-006] Ses işleme hatası: ${e.message}`);
  }
}

// ──────────────────────────────────────────────────────────────────
// MOTORU SEÇ (görev tipine göre)
// ──────────────────────────────────────────────────────────────────
function motorSec(gorevTipi) {
  const sirali = GOREV_MOTOR_ESLESTIRME[gorevTipi] || ['open-webui'];
  return sirali; // öncerik sıralı liste
}

// ──────────────────────────────────────────────────────────────────
// MOTOR DURUMU RAPORU (Log için)
// ──────────────────────────────────────────────────────────────────
function motorRaporu() {
  return Object.entries(PINOKIO_MOTORLAR).map(([id, m]) => ({
    id, isim: m.isim, port: m.port, gorev_tipleri: m.gorev_tipleri,
  }));
}

console.log(`[PKM] ${Object.keys(PINOKIO_MOTORLAR).length} Pinokio motoru tanımlı ve kayıtlı.`);
console.log(`[PKM] Motorlar: ${Object.keys(PINOKIO_MOTORLAR).join(', ')}`);

module.exports = {
  PINOKIO_MOTORLAR,
  GOREV_MOTOR_ESLESTIRME,
  pinokioSaglikKontrol,
  tumMotorlarSaglikKontrol,
  gorselUret,
  sesDonustur,
  motorSec,
  motorRaporu,
};
