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

// ── AJAN KADROSU (15 GÖREV MOTORU) ────────────────────────
const AJANLAR = {
  // Strateji ve Analiz (K Serisi)
  'K-1':  { isim: 'Stratejist',       rol: 'Görev analizi, projelendirme ve önceliklendirme.' },
  'K-2':  { isim: 'Analist',          rol: 'Risk tespiti, gereksinim çıkarma ve yol haritası çizimi.' },

  // İcracı Motorlar (A Serisi)
  'A-01': { isim: 'İcracı-Frontend',  rol: 'Kullanıcı arayüzü, React/Next.js kod yazımı ve UI entegrasyonu.' },
  'A-02': { isim: 'İcracı-Backend',   rol: 'Sunucu mantığı, API yazımı ve sistem entegrasyonları.' },
  'A-03': { isim: 'İcracı-DB',        rol: 'Veritabanı tasarımı, Supabase RLS ve SQL sorguları.' },
  'A-04': { isim: 'İcracı-Güvenlik',  rol: 'Token yetkilendirmesi, ihlal kapatma ve güvenlik yamaları.' },
  'A-05': { isim: 'İcracı-Entegrasyon',rol: 'Dış API (Telegram/WhatsApp vb.) ve 3. parti servis bağlantıları.' },
  'A-06': { isim: 'İcracı-DevOps',    rol: 'Sunucu ayarları, GitHub Actions, CI/CD ve dağıtım işlemleri.' },
  'A-07': { isim: 'İcracı-Tasarım',   rol: 'CSS, Tailwind, estetik ve kullanıcı deneyimi geliştirmeleri.' },

  // Denetim Motorları (L Serisi)
  'L-1':  { isim: 'Hata Ayıklayıcı',  rol: 'Yazılan koddaki sözdizimi ve mantık hatalarını (Bug) tespit etme.' },
  'L-2':  { isim: 'Sistem Denetçisi', rol: 'Sistem Kuralları (Nizam) doktrinine uygunluk kontrolü.' },
  'L-3':  { isim: 'Güvenlik Denetçisi',rol: 'Sızma testleri, zero-day açık kontrolü ve risk denetimi.' },
  'L-4':  { isim: 'Performans Optimizatörü', rol: 'Token maliyeti azaltma, hızlandırma ve kaynak optimizasyonu.' },

  // Arşiv ve Kapanış (G Serisi)
  'G-8':  { isim: 'Arşiv Uzmanı',     rol: 'Tamamlanan işlemlerin loglanması, dokümantasyonu ve mühürlenmesi.' }
};

async function routeTaskG2(task) {
  const systemPrompt = `Sen Sistem Takip Paneli (STP) G-2 Otonom Görev Dağıtıcı'sısın. 
  Görevi analiz et ve işe en uygun ajanı (motoru) SEÇ. Toplam 15 uzman ajanımız var:
  
  AJANLAR LİSTESİ:
  K-1 (Strateji), K-2 (Analiz/Risk)
  A-01 (Frontend), A-02 (Backend), A-03 (Veritabanı), A-04 (Güvenlik), A-05 (Dış API), A-06 (DevOps), A-07 (UI/UX)
  L-1 (Bug Tespiti), L-2 (Ana Denetçi), L-3 (Sızma/Güvenlik Açığı Türleri), L-4 (Performans Uzmanı)
  G-8 (Arşiv ve Evrak Dokümantasyonu)
  
  Görev metnine en uygun olan sadece TEK BİR AJAN_ID döndür (Örn: A-01 veya L-3). 
  JSON veya başka bir şey yazma, KESİNLİKLE sadece ID yaz.`;
  
  try {
    const response = await AI.chat(`Görev Başlığı: ${task.title}\nAçıklama: ${task.description || ''}`, systemPrompt);
    const textOut = response.content.trim().toUpperCase();
    
    // Düzenli ifade ile sadece uygun ajan ID'sini ayıkla
    const idMatch = textOut.match(/([KkAaLlGg]-\d{1,2})/);
    if (idMatch) {
        const ajanId = idMatch[1].toUpperCase();
        if (AJANLAR[ajanId]) return ajanId;
    }
  } catch (e) {
    log(`G-2 Rotalama Hatası: ${e.message}, fallback uygulanıyor.`, 'WARN');
  }

  // Fallback Zekası (Manuel yedekleme)
  const lower = task.title.toLowerCase();
  if (['veritabanı', 'sql', 'migration', 'supabase'].some(k => lower.includes(k))) return 'A-03';
  if (['api', 'webhook', 'servis'].some(k => lower.includes(k))) return 'A-05';
  if (['arayüz', 'görsel', 'css', 'tasarım'].some(k => lower.includes(k))) return 'A-07';
  if (['güvenlik', 'hack', 'yetki', 'token'].some(k => lower.includes(k))) return 'A-04';
  if (['hata', 'bug', 'düzelt'].some(k => lower.includes(k))) return 'L-1';
  if (['denetle', 'kontrol', 'test'].some(k => lower.includes(k))) return 'L-2';
  return 'A-02'; // En genel teknik fallback: Backend
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
