// ============================================================
// Planlama_Departmani/index.js — Kurul Masası Motor v3
// ============================================================
// MİMARİ DEĞİŞİKLİK (2026-04-25):
//   ÖNCE: Supabase'den poll ile görev çeker (pasif bekleme)
//   ARTIK: Panel / Kurul Masası'ndan görev alır (aktif sunucu)
//          → Görev bitti → Sonuç Supabase'e kaydedilir
//
// AKIŞ:
//   Panel/WhatsApp → POST /gorev-al → processTask()
//   → Tamamlandı → Supabase'e kayıt → Panel bilgilendirilir
//
// MODÜL HATA KODLARI (PLN-xxx):
//   PLN-001 : SUPABASE_URL tanımsız
//   PLN-002 : SUPABASE_ANON_KEY tanımsız
//   PLN-003 : Supabase bağlantı hatası
//   PLN-004 : Görev işleme hatası
//   PLN-005 : Max retry aşıldı
//   PLN-006 : EDK-25 ihlali tespit edildi
//   PLN-007 : PDP-44 yetersiz — görev reddedildi
// ============================================================

'use strict';

const http   = require('http');
const { createClient } = require('@supabase/supabase-js');
const fs     = require('fs');
const path   = require('path');
const { processTask, AJANLAR } = require('./planlama_islemci');
const { pdp44Rapor, PDP44_AI_PROMPT } = require('../shared/pdp_44');
const { edk25SistemPrompt, edk25CiktiTara } = require('../shared/edk_25');

// ── .env YÜKLE ───────────────────────────────────────────────
function loadEnv() {
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) return;
    for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
        const t = line.trim();
        if (!t || t.startsWith('#')) continue;
        const idx = t.indexOf('=');
        if (idx === -1) continue;
        const k = t.slice(0, idx).trim();
        const v = t.slice(idx + 1).trim();
        if (!process.env[k]) process.env[k] = v;
    }
}
loadEnv();

// ── YAPILANDIRMA ─────────────────────────────────────────────
const SUPABASE_URL  = process.env.SUPABASE_URL  || '';
const SUPABASE_KEY  = process.env.SUPABASE_ANON_KEY || '';
const PORT          = parseInt(process.env.PLANLAMA_PORT || '3099');
const MAX_RETRIES   = parseInt(process.env.MAX_RETRIES || '3');
const LOG_FILE      = path.join(__dirname, 'ajanlar.log');

if (!SUPABASE_URL || SUPABASE_URL.length < 10) {
    console.error('[PLN-001] KRİTİK: SUPABASE_URL tanımlı değil!'); process.exit(1);
}
if (!SUPABASE_KEY || SUPABASE_KEY.length < 10) {
    console.error('[PLN-002] KRİTİK: SUPABASE_ANON_KEY tanımlı değil!'); process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── LOG ──────────────────────────────────────────────────────
function log(msg, level = 'INFO') {
    const line = `[${new Date().toISOString()}] [${level}] ${msg}`;
    console.log(line);
    fs.appendFileSync(LOG_FILE, line + '\n', 'utf-8');
}

// ── SUPABASE KAYIT (Görev bitince çağrılır) ──────────────────
async function goreviSupabaseKaydet(taskId, sonuc, durum = 'tamamlandi') {
    try {
        const { error } = await supabase
            .from('tasks')
            .update({
                status:     durum,
                result:     typeof sonuc === 'string' ? sonuc : JSON.stringify(sonuc),
                updated_at: new Date().toISOString(),
            })
            .eq('id', taskId);

        if (error) {
            log(`[PLN-003] Supabase kayıt hatası [${taskId}]: ${error.message}`, 'ERROR');
        } else {
            log(`[SUPABASE] ✅ Görev kaydedildi: ${taskId} → ${durum}`);
        }
    } catch (e) {
        log(`[PLN-003] Supabase erişim hatası: ${e.message}`, 'ERROR');
    }
}

// ── SUPABASE YENİ GÖREV KAYDI (Panel'den gelen görev) ────────
async function goreviSupabaseOlustur(gorevData) {
    try {
        const { data, error } = await supabase
            .from('tasks')
            .insert({
                task_code:   gorevData.task_code || `PLN-${Date.now()}`,
                title:       gorevData.title || gorevData.content,
                status:      'isleniyor',
                priority:    gorevData.priority || 'normal',
                created_at:  new Date().toISOString(),
                updated_at:  new Date().toISOString(),
                is_archived: false,
                metadata: {
                    source:  gorevData.source || 'panel',
                    hat_zamani: new Date().toISOString(),
                },
            })
            .select('id')
            .single();

        if (error) {
            log(`[PLN-003] Görev oluşturma hatası: ${error.message}`, 'ERROR');
            return null;
        }
        return data?.id;
    } catch (e) {
        log(`[PLN-003] Supabase insert hatası: ${e.message}`, 'ERROR');
        return null;
    }
}

// ── GÖREV İŞLEME (PDP-44 + EDK-25 + processTask) ────────────
async function goreviIsle(payload, res) {
    const { content, task_code, source, agent_id } = payload;

    log(`\n══════════════════════════════════════════`);
    log(`  YENİ GÖREV [${task_code || 'ADSIZ'}] ← ${source || 'panel'}`);
    log(`══════════════════════════════════════════`);

    // ── KATMAN 1: PDP-44 Tarama ──────────────────────────────
    const pdp = pdp44Rapor(content);
    log(`[PDP-44] ${pdp.pdp44_puan} | ${pdp.durum}`);
    if (pdp.durum === 'TAM_BELIRSIZ') {
        const redMsg = `[PLN-007] PDP-44 TAM_BELIRSIZ — Eksik: ${pdp.eksik_maddeler.slice(0,5).join(' | ')}`;
        log(redMsg, 'WARN');
        return cevapGonder(res, 400, { durum: 'RED', neden: redMsg, pdp44: pdp });
    }

    // ── KATMAN 2: Supabase'e Görev Oluştur ───────────────────
    const gorev = {
        id:         null,
        task_code:  task_code || `PLN-${Date.now()}`,
        content,
        title:      content,
        source:     source || 'panel',  // Bellekte source tutulur ama Supabase insert'e GİTMEZ
        retry_count: 0,
    };
    gorev.id = await goreviSupabaseOlustur({ ...gorev, status: 'isleniyor' });
    if (!gorev.id) {
        log(`[PLN-003] Supabase'e görev kaydedilemedi — bellekte devam ediliyor`, 'WARN');
    }

    // ── KATMAN 3: processTask (Ajan motoru) ──────────────────
    let sonuc;
    let retries = 0;
    let basarili = false;

    while (retries <= MAX_RETRIES && !basarili) {
        try {
            sonuc = await processTask(gorev, supabase, log);
            basarili = true;
        } catch (err) {
            retries++;
            log(`[PLN-004] İşleme hatası (deneme ${retries}): ${err.message}`, 'ERROR');
            if (retries > MAX_RETRIES) {
                const hata = `[PLN-005] Max retry (${MAX_RETRIES}) aşıldı.`;
                log(hata, 'ERROR');
                if (gorev.id) await goreviSupabaseKaydet(gorev.id, hata, 'reddedildi');
                return cevapGonder(res, 500, { durum: 'HATA', neden: hata });
            }
        }
    }

    // ── KATMAN 4: EDK-25 Çıktı Tarama ────────────────────────
    const sonucStr = typeof sonuc === 'string' ? sonuc : JSON.stringify(sonuc);
    const edkTarama = edk25CiktiTara(sonucStr);
    if (!edkTarama.gecerli) {
        log(`[PLN-006] EDK-25 ihlali: ${edkTarama.ihlaller.join(' | ')}`, 'WARN');
        // İhlal var ama bloklamıyoruz — sadece kayıt ve uyarı
    }

    // ── KATMAN 5: Supabase'e Sonuç Kaydet ────────────────────
    if (gorev.id) {
        await goreviSupabaseKaydet(gorev.id, sonucStr, 'tamamlandi');
    }

    log(`[TAMAMLANDI] ${gorev.task_code} → Supabase kaydedildi.`);
    // DÜZELTİLDİ (2026-04-26): Panel'in pipeline durumunu göstermesi için
    // kararlar ve algoritma sonuçları yanıta eklendi
    const kararlar = sonuc?.algoritma_sonucu || sonuc?.kararlar || {};
    return cevapGonder(res, 200, {
        durum:     'TAMAM',
        task_code: gorev.task_code,
        task_id:   gorev.id,
        pdp44:     pdp,
        kararlar:  kararlar,
        edk:       { gecerli: edkTarama.gecerli, ihlal_sayisi: edkTarama.ihlaller?.length || 0 },
        sonuc:     sonucStr.substring(0, 500),
    });
}

// ── HTTP CEVAP ────────────────────────────────────────────────
function cevapGonder(res, status, data) {
    if (!res) return data;
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(data, null, 2));
    return data;
}

// ── JSON PARSE ────────────────────────────────────────────────
function jsonParse(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try { resolve(JSON.parse(body)); }
            catch { reject(new Error('Geçersiz JSON')); }
        });
    });
}

// ── HTTP SUNUCUSU (Panel → Motor köprüsü) ────────────────────
const server = http.createServer(async (req, res) => {
    const url    = req.url;
    const method = req.method;

    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    // ── ROTA: POST /gorev-al ──────────────────────────────────
    // Panel veya WhatsApp botu buraya POST atar
    if (url === '/gorev-al' && method === 'POST') {
        try {
            const payload = await jsonParse(req);
            if (!payload?.content) {
                return cevapGonder(res, 400, { durum: 'RED', neden: 'content alanı zorunlu' });
            }
            await goreviIsle(payload, res);
        } catch (e) {
            log(`[PLN-004] İstek parse hatası: ${e.message}`, 'ERROR');
            cevapGonder(res, 400, { durum: 'HATA', neden: e.message });
        }
        return;
    }

    // ── ROTA: GET /saglik ─────────────────────────────────────
    if (url === '/saglik' && method === 'GET') {
        return cevapGonder(res, 200, {
            durum:   'CANLI',
            ajanlar: Object.keys(AJANLAR).length,
            port:    PORT,
            mimari:  'panel-push-v3',
            zaman:   new Date().toISOString(),
        });
    }

    // ── ROTA: POST /dogrudan-kaydet ───────────────────────────
    // Bir görevin sonucunu direkt Supabase'e kaydet (harici servis için)
    if (url === '/dogrudan-kaydet' && method === 'POST') {
        try {
            const { task_id, sonuc, durum } = await jsonParse(req);
            if (!task_id || !sonuc) {
                return cevapGonder(res, 400, { durum: 'RED', neden: 'task_id ve sonuc zorunlu' });
            }
            await goreviSupabaseKaydet(task_id, sonuc, durum || 'tamamlandi');
            return cevapGonder(res, 200, { durum: 'KAYDEDILDI', task_id });
        } catch (e) {
            return cevapGonder(res, 400, { durum: 'HATA', neden: e.message });
        }
    }

    // 404
    cevapGonder(res, 404, { durum: 'BULUNAMADI', rota: url });
});

// ── BAŞLAT ────────────────────────────────────────────────────
async function start() {
    log('══════════════════════════════════════════════════════');
    log('  STP PLANLAMA MOTORU v3 — Panel-Push Mimarisi        ');
    log('  Polling KAPALI | Gorev: Panelden push | Kayit: Supabase');
    log('══════════════════════════════════════════════════════');
    log(`Ajan kadrosu: ${Object.keys(AJANLAR).length} birim`);

    // Supabase bağlantı testi
    const { error } = await supabase.from('tasks').select('id').limit(1);
    if (error) {
        log(`[PLN-003] Supabase bağlantı hatası: ${error.message}`, 'WARN');
        log('[DEVAM] Supabase olmadan (sadece log modunda) çalışılıyor...', 'WARN');
    } else {
        log('✅ Supabase bağlantısı doğrulandı.');
    }

    server.listen(PORT, '0.0.0.0', () => {
        log(`🚀 Motor ayakta: http://localhost:${PORT}`);
        log(`  POST /gorev-al       → Görev gönder (panelden)`);
        log(`  GET  /saglik         → Durum kontrol`);
        log(`  POST /dogrudan-kaydet → Sonuç kaydet (harici)`);
    });
}

start().catch(e => { log(`BAŞLATMA HATASI: ${e.message}`, 'CRITICAL'); process.exit(1); });
process.once('SIGINT',  () => { log('Motor durduruldu (SIGINT).');  server.close(); process.exit(0); });
process.once('SIGTERM', () => { log('Motor durduruldu (SIGTERM).'); server.close(); process.exit(0); });

// ── DIŞ KULLANIM (WhatsApp, diğer modüller için) ─────────────
module.exports = { goreviIsle, goreviSupabaseKaydet, supabase };
