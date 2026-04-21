// ============================================================
// AI AJANLAR — Bağımsız Ajan Motoru v1
// ============================================================
// PROJESİ: Sistem Takip Paneli (STP)
// DURUM:   BAĞIMSIZ MODÜL — Frontend_Panel'den ayrı çalışır.
//
// NE YAPAR:
//   1. Supabase'den "beklemede" görevleri çeker
//   2. Gemini AI ile görevi analiz eder
//   3. Görev planı oluşturur
//   4. Sonucu veritabanına yazar
//   5. Her şeyi loglar
//
// AJAN KADROSU:
//   K-1  : Stratejist — Görev planlaması
//   A-01 : İcracı — Kod ve dosya işlemleri
//   A-03 : Veritabanı — DB sorguları
//   L-2  : Denetçi — Kalite kontrol
//
// Çalıştır: npm start  (veya: node index.js)
// ============================================================

const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs   = require('fs');
const path = require('path');
const { promptEnjeksiyon, kuralKontrol, yanitDenetim, ihlalLog } = require('../shared/sistemKurallari');
const AI = require('../shared/aiOrchestrator');

// ── .env YÜKLE ──────────────────────────────────────────────
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnv();

// ── YAPILANDIRMA ────────────────────────────────────────────
const SUPABASE_URL  = process.env.SUPABASE_URL || '';
const SUPABASE_KEY  = process.env.SUPABASE_ANON_KEY || '';
const GEMINI_KEY    = process.env.GEMINI_API_KEY || '';
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL_MS || '10000');
const MAX_RETRIES   = parseInt(process.env.MAX_RETRIES || '3');
const LOG_FILE      = path.join(__dirname, 'ajanlar.log');

// ── SUPABASE CLIENT ─────────────────────────────────────────
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);


// ── LOG ─────────────────────────────────────────────────────
function log(msg, level = 'INFO') {
  const ts   = new Date().toISOString();
  const line = `[${ts}] [${level}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + '\n', 'utf-8');
}

// ── AJAN KADROSU ────────────────────────────────────────────
const AJANLAR = {
  'K-1':  { isim: 'Stratejist',   rol: 'Görev analizi ve planlama. Görevi parçalara ayırır, öncelik belirler.' },
  'A-01': { isim: 'İcracı-Kod',   rol: 'Kod yazma, dosya düzenleme, teknik uygulama.' },
  'A-03': { isim: 'İcracı-DB',    rol: 'Veritabanı sorguları, migration, veri yönetimi.' },
  'A-05': { isim: 'İcracı-API',   rol: 'API entegrasyonu, dış servis bağlantıları.' },
  'L-2':  { isim: 'Denetçi',      rol: 'Kalite kontrol. Yapılan işi doğrular, hata arar.' },
};

async function routeTaskG2(task) {
  const systemPrompt = `Sen Sistem Takip Paneli (STP) G-2 Otonom Görev Dağıtıcı'sısın. 
  Görevi analiz et ve en uygun ajanı seç.
  AJANLAR:
  - A-01: İcracı-Kod (Frontend, Backend, Dosya İşlemleri)
  - A-03: İcracı-DB (Supabase, SQL, Veritabanı Mantığı)
  - A-05: İcracı-API (Dış bağlantılar, Entegrasyonlar)
  - K-1: Stratejist (Genel planlama, analiz)
  
  Sadece AJAN_ID döndür (Örn: A-01). Başka bir şey yazma.`;
  
  try {
    const response = await AI.chat(`Görev: ${task.title}\nAçıklama: ${task.description || ''}`, systemPrompt);
    const ajanId = response.content.trim().toUpperCase();
    if (AJANLAR[ajanId]) return ajanId;
  } catch (e) {
    log(`G-2 Rotalama Hatası: ${e.message}, fallback uygulanıyor.`, 'WARN');
  }

  // Fallback (eski mantık)
  const lower = task.title.toLowerCase();
  if (['veritabanı', 'sql', 'migration', 'tablo', 'supabase'].some(k => lower.includes(k))) return 'A-03';
  if (['api', 'endpoint', 'servis', 'bağlantı'].some(k => lower.includes(k))) return 'A-05';
  return 'A-01';
}

async function analyzeTask(task, ajanId) {
  const agent = AJANLAR[ajanId];
  const systemPrompt = `Sen "${agent.isim}" ajanısın. STP L1 YAPICI (Execution Engine) olarak görevi planlamaktan sorumlusun.
  
  ${promptEnjeksiyon(ajanId)}
  
  Görevi atomik adımlara böl ve JSON formatında döndür.`;

  const userPrompt = `Görev: "${task.title}"\nÖncelik: ${task.priority}`;

  try {
    const response = await AI.chat(userPrompt, systemPrompt, { temperature: 0.2 });
    const text = response.content;
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return { plan: text.substring(0, 500), steps: [], risk: 'belirsiz', ajan: agent.isim };
  } catch (err) {
    log(`L1 ANALİZ HATA: ${err.message}`, 'ERROR');
    return { plan: `Hata: ${err.message}`, steps: [], risk: 'yüksek', ajan: agent.isim };
  }
}

// ── GÖREV İŞLE ──────────────────────────────────────────────
async function processTask(task) {
  // G-2 Otonom Görev Atama
  const ajanId = await routeTaskG2(task);
  const ajan = AJANLAR[ajanId];
  
  log(`📋 [G-2] Görev atandı: [${task.task_code}] → ${ajan.isim} (${ajanId})`);

  // SİSTEM KURALLARI: Giriş kontrolü
  const girisKontrol = kuralKontrol('GOREV_ISLEM', task.title);
  if (!girisKontrol.gecti) {
    const logMsg = ihlalLog('PLANLAMA', girisKontrol);
    if (logMsg) log(logMsg, 'WARN');
    log(`🚫 Görev engellendi [${task.task_code}]: ${girisKontrol.ihlaller.map(i => i.aciklama).join(', ')}`, 'WARN');
    await supabase.from('tasks')
      .update({ status: 'reddedildi', updated_at: new Date().toISOString(), metadata: { ...task.metadata, sistem_kurallari_red: girisKontrol } })
      .eq('id', task.id);
    return { plan: 'Sistem kuralları tarafından reddedildi', steps: [], risk: 'yüksek' };
  }

  // 1. Durumu "devam_ediyor" yap
  await supabase.from('tasks')
    .update({ status: 'devam_ediyor', updated_at: new Date().toISOString() })
    .eq('id', task.id);

  // 2. L1 YAPICI: Analiz ve Planlama
  log(`🧠 [L1] Analiz başlıyor...`);
  const analysis = await analyzeTask(task, ajanId);
  log(`✅ AI analiz tamamlandı: risk=${analysis.risk}, adım=${analysis.steps?.length || 0}`);

  // SİSTEM KURALLARI: AI yanıt denetimi
  const yanitSonuc = yanitDenetim(analysis.plan || '', ajanId);
  if (yanitSonuc.ihlal_var) {
    const logMsg = ihlalLog('PLANLAMA_YANIT', yanitSonuc);
    if (logMsg) log(logMsg, 'WARN');
    if (yanitSonuc.iptal) {
      log(`🚫 AI yanıtı kural ihlali nedeniyle reddedildi [${task.task_code}]`, 'WARN');
      analysis.plan = '[SİSTEM KURALLARI] AI yanıtı filtrelendi: ' + yanitSonuc.ihlaller.map(i => i.aciklama).join(', ');
    }
  }

  // 3. Sonucu kaydet
  await supabase.from('tasks')
    .update({
      status: 'dogrulama',
      updated_at: new Date().toISOString(),
      metadata: {
        ...task.metadata,
        ai_analiz_sonucu: analysis,
        islenen_ajan: ajanId,
        isleme_zamani: new Date().toISOString(),
      },
    })
    .eq('id', task.id);

  // 4. Audit log yaz
  try {
    await supabase.from('audit_logs').insert([{
      action_code: 'AI_TASK_PROCESSED',
      operator_id: ajanId,
      details: {
        task_id: task.id,
        task_code: task.task_code,
        title: task.title,
        ajan: ajan.isim,
        plan: analysis.plan,
        risk: analysis.risk,
        steps: analysis.steps,
      },
    }]);
  } catch (e) { log(`Audit log yazılamadı: ${e.message}`, 'WARN'); }

  log(`📌 Görev işlendi: [${task.task_code}] → durum: dogrulama`);
  return analysis;
}

// ── ANA DÖNGÜ ───────────────────────────────────────────────
let isRunning = false;

async function pollTasks() {
  if (isRunning) return;
  isRunning = true;

  try {
    // Beklemedeki görevleri al
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('status', 'beklemede')
      .eq('is_archived', false)
      .order('created_at', { ascending: true })
      .limit(5);

    if (error) {
      log(`DB HATA: ${error.message}`, 'ERROR');
      return;
    }

    if (!tasks || tasks.length === 0) {
      // Sessiz — görev yok
      return;
    }

    log(`📥 ${tasks.length} bekleyen görev bulundu.`);

    for (const task of tasks) {
      try {
        await processTask(task);
      } catch (err) {
        log(`GÖREV İŞLEME HATA [${task.task_code}]: ${err.message}`, 'ERROR');
        
        // Retry sayısını artır
        const retries = (task.retry_count || 0) + 1;
        if (retries >= MAX_RETRIES) {
          await supabase.from('tasks')
            .update({ status: 'reddedildi', retry_count: retries, updated_at: new Date().toISOString() })
            .eq('id', task.id);
          log(`❌ Görev reddedildi (max retry): [${task.task_code}]`, 'ERROR');
        } else {
          await supabase.from('tasks')
            .update({ retry_count: retries, updated_at: new Date().toISOString() })
            .eq('id', task.id);
        }
      }
    }
  } finally {
    isRunning = false;
  }
}

// ── BAŞLAT ──────────────────────────────────────────────────
async function start() {
  log('══════════════════════════════════════════════');
  log('  STP AI AJANLAR — Bağımsız Motor v1         ');
  log('  Supabase + Gemini AI + Otonom Görev İşleme  ');
  log('══════════════════════════════════════════════');

  // Bağlantı testi
  const { error: dbErr } = await supabase.from('tasks').select('id').limit(1);
  if (dbErr) {
    log(`❌ Supabase bağlantı hatası: ${dbErr.message}`, 'CRITICAL');
    process.exit(1);
  }
  log('✅ Supabase bağlantısı doğrulandı.');

  log('✅ AI Bağlantısı (Orkestratör/Local-First) doğrulandı.');

  log(`⏱️  Görev tarama aralığı: ${POLL_INTERVAL / 1000}sn`);
  log(`🔄 Maksimum tekrar deneme: ${MAX_RETRIES}`);
  log('');
  log('🚀 Ajan motoru başlatıldı. Görev bekleniyor...');

  // İlk tarama
  await pollTasks();

  // Periyodik tarama
  setInterval(pollTasks, POLL_INTERVAL);
}

start().catch(err => {
  log(`BAŞLATMA HATASI: ${err.message}`, 'CRITICAL');
  process.exit(1);
});

// Graceful shutdown
process.once('SIGINT',  () => { log('Motor durduruldu (SIGINT).'); process.exit(0); });
process.once('SIGTERM', () => { log('Motor durduruldu (SIGTERM).'); process.exit(0); });
