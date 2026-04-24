/**
 * 7/24 OLLAMA ve KURUL MASASI BEKÇİSİ (WATCHDOG)
 * 
 * Bu script arka planda çalışır ve:
 * 1. Her 10 saniyede Ollama'nın ayakta olup olmadığını kontrol eder
 * 2. Ollama çökmüşse otomatik yeniden başlatır
 * 3. 10 modelin yerinde olup olmadığını kontrol eder
 * 4. Frontend dev sunucusunun ayakta olup olmadığını kontrol eder
 * 5. Log tutar (yerel)
 * 
 * ÇALISTIRMA: node Kamera_Alarm_Departmani/kurul_bekcisi.js
 */

const http = require('http');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const LOG_DOSYASI = path.join(__dirname, '..', 'Local_Veri_Arsivi', 'watchdog_log.txt');
const OLLAMA_URL = 'http://localhost:11434';
const PANEL_URL = 'http://127.0.0.1:3000';
const KONTROL_SURESI_MS = 10000; // 10 saniye

const BEKLENEN_MODELLER = [
    'command-r', 'llava', 'starcoder2', 'codellama', 'mistral',
    'gemma2', 'deepseek-coder-v2', 'phi3', 'qwen2.5', 'llama3.1'
];

let ollamaCanli = false;
let panelCanli = false;
let sonKontrolZamani = null;
let toplamKontrol = 0;
let toplamHata = 0;

function log(mesaj) {
    const zaman = new Date().toISOString();
    const satir = `[${zaman}] ${mesaj}`;
    console.log(satir);
    try {
        fs.mkdirSync(path.dirname(LOG_DOSYASI), { recursive: true });
        fs.appendFileSync(LOG_DOSYASI, satir + '\n');
    } catch(e) {}
}

function httpKontrol(url, timeout = 3000) {
    return new Promise((resolve) => {
        try {
            const req = http.get(url, { timeout }, (res) => {
                resolve(res.statusCode === 200);
            });
            req.on('error', () => resolve(false));
            req.on('timeout', () => { req.destroy(); resolve(false); });
        } catch(e) { resolve(false); }
    });
}

async function ollamaModelleriniKontrolEt() {
    return new Promise((resolve) => {
        http.get(`${OLLAMA_URL}/api/tags`, { timeout: 5000 }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    const mevcutModeller = json.models.map(m => m.name.split(':')[0]);
                    const eksikler = BEKLENEN_MODELLER.filter(b => !mevcutModeller.some(m => m.includes(b)));
                    resolve({ mevcut: mevcutModeller, eksik: eksikler });
                } catch(e) { resolve({ mevcut: [], eksik: BEKLENEN_MODELLER }); }
            });
        }).on('error', () => resolve({ mevcut: [], eksik: BEKLENEN_MODELLER }));
    });
}

function ollamaYenidenBaslat() {
    log('[ACİL] Ollama çökmüş! Yeniden başlatılıyor...');
    exec('ollama serve', (err) => {
        if (err) {
            log(`[ACİL HATA] Ollama başlatılamadı: ${err.message}`);
        } else {
            log('[KURTARMA] Ollama yeniden başlatıldı.');
        }
    });
}

async function anaKontrolDongusu() {
    toplamKontrol++;
    sonKontrolZamani = new Date().toISOString();

    // 1. OLLAMA SAĞLIK KONTROLÜ
    const ollamaSaglikli = await httpKontrol(`${OLLAMA_URL}/api/tags`);
    
    if (ollamaSaglikli && !ollamaCanli) {
        log('[CANLI] Ollama AYAKTA. Modeller kontrol ediliyor...');
    }
    
    if (!ollamaSaglikli) {
        toplamHata++;
        log('[ALARM] Ollama YANIT VERMİYOR!');
        ollamaCanli = false;
        ollamaYenidenBaslat();
        return;
    }
    
    ollamaCanli = true;

    // 2. MODEL ENVANTER KONTROLÜ
    const { mevcut, eksik } = await ollamaModelleriniKontrolEt();
    
    if (eksik.length > 0) {
        log(`[UYARI] Eksik modeller: ${eksik.join(', ')}`);
    }

    // 3. PANEL SAĞLIK KONTROLÜ
    const panelSaglikli = await httpKontrol(PANEL_URL);
    
    if (panelSaglikli && !panelCanli) {
        log('[CANLI] Frontend Panel (port 3000) AYAKTA.');
    }
    if (!panelSaglikli && panelCanli) {
        log('[UYARI] Frontend Panel (port 3000) YANIT VERMİYOR.');
    }
    panelCanli = panelSaglikli;

    // 4. DURUM RAPORU (Her 30 kontrolde bir)
    if (toplamKontrol % 30 === 0) {
        log(`[RAPOR] Toplam kontrol: ${toplamKontrol} | Hata: ${toplamHata} | Ollama: ${ollamaCanli ? 'CANLI' : 'ÖLMÜŞ'} | Panel: ${panelCanli ? 'CANLI' : 'KAPALI'} | Modeller: ${mevcut.length}/10`);
    }
}

// BAŞLAT
log('==================================================================');
log(' 7/24 KURUL MASASI BEKÇİSİ (WATCHDOG) BAŞLATILDI');
log(' Ollama + 10 Model + Frontend Panel sürekli izleniyor.');
log(' Çökme tespit edilirse otomatik kurtarma devreye girer.');
log('==================================================================');

// İlk kontrol hemen
anaKontrolDongusu();

// Sonra her 10 saniyede tekrar
setInterval(anaKontrolDongusu, KONTROL_SURESI_MS);

// Süreç kapanmasını engelle
process.on('SIGINT', () => {
    log('[KAPANIŞ] Watchdog manuel olarak durduruldu.');
    process.exit(0);
});
