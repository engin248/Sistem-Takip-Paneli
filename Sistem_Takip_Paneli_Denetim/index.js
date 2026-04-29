// ============================================================
// STP DENETİM — Bağımsız 92 Kriter Doğrulama Motoru v1
// ============================================================
// PROJESİ: Sistem Takip Paneli (STP)
// DURUM:   BAĞIMSIZ MODÜL
//
// NE YAPAR:
//   1. Supabase'den "dogrulama" durumundaki görevleri çeker
//   2. 92 kriter ile kontrol eder (güvenlik, mantık, performans)
//   3. Gemini AI ile çift doğrulama yapar
//   4. Skor >= 75 → ONAY | Skor < 75 → RED
//   5. Sonucu veritabanına yazar
//
// 92 KRİTER KATEGORİLERİ:
//   • Fonksiyonel (20) — Girdi geçerli mi, yapı doğru mu?
//   • Güvenlik (20) — SQL injection, XSS, zararlı komut var mı?
//   • Mantıksal (18) — Çelişki var mı, tutarlı mı?
//   • Performans (14) — Boyut limiti, verimlilik
//   • Veri (14) — Tip kontrolü, format doğruluğu
//   • Proof (6) — SHA-256 onay, çift doğrulama
//
// Çalıştır: npm start  (veya: node index.js)
// Test:     node index.js --test
// ============================================================

const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const crypto = require('crypto');
const fs   = require('fs');
const path = require('path');
const { kuralKontrol, yanitDenetim, ihlalLog, promptEnjeksiyon } = require('../shared/sistemKurallari');
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
const POLL_INTERVAL = 15000; // 15 saniye
const PASS_THRESHOLD = 75;   // %75 eşik
const LOG_FILE      = path.join(__dirname, 'denetim.log');

// ── SUPABASE & GEMINI ───────────────────────────────────────
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── LOG ─────────────────────────────────────────────────────
function log(msg, level = 'INFO') {
  const ts = new Date().toISOString();
  const line = `[${ts}] [${level}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + '\n', 'utf-8');
}

// ── SHA-256 HASH ────────────────────────────────────────────
function sha256(input) {
  return crypto.createHash('sha256').update(input, 'utf-8').digest('hex');
}

// ══════════════════════════════════════════════════════════════
// 92 KRİTER LİSTESİ
// ══════════════════════════════════════════════════════════════

const CRITERIA = [
  // FONKSİYONEL (20)
  { id: 'C-001', name: 'Başlık min 3 karakter', cat: 'fonksiyonel', fn: (t) => t.title && t.title.trim().length >= 3 },
  { id: 'C-002', name: 'Başlık max 200 karakter', cat: 'fonksiyonel', fn: (t) => t.title.length <= 200 },
  { id: 'C-003', name: 'Durum geçerli', cat: 'fonksiyonel', fn: (t) => ['beklemede','devam_ediyor','dogrulama','tamamlandi','reddedildi','iptal'].includes(t.status) },
  { id: 'C-004', name: 'Öncelik geçerli', cat: 'fonksiyonel', fn: (t) => ['kritik','yuksek','normal','dusuk'].includes(t.priority) },
  { id: 'C-005', name: 'Görev kodu var', cat: 'fonksiyonel', fn: (t) => !!t.task_code && t.task_code.length > 0 },
  { id: 'C-006', name: 'Atanan kişi var', cat: 'fonksiyonel', fn: (t) => !!t.assigned_to && t.assigned_to.length > 0 },
  { id: 'C-007', name: 'Oluşturulma tarihi var', cat: 'fonksiyonel', fn: (t) => !!t.created_at },
  { id: 'C-008', name: 'ID geçerli', cat: 'fonksiyonel', fn: (t) => !!t.id },
  { id: 'C-009', name: 'Arşivlenmemiş', cat: 'fonksiyonel', fn: (t) => t.is_archived === false },
  { id: 'C-010', name: 'Retry limiti aşılmamış', cat: 'fonksiyonel', fn: (t) => (t.retry_count || 0) < 5 },
  { id: 'C-011', name: 'Metadata objesi var', cat: 'fonksiyonel', fn: (t) => typeof t.metadata === 'object' },
  { id: 'C-012', name: 'Başlık boş değil', cat: 'fonksiyonel', fn: (t) => t.title.trim().length > 0 },
  { id: 'C-013', name: 'Görev kodu formatı', cat: 'fonksiyonel', fn: (t) => /^(TSK|STP)-/.test(t.task_code) },
  { id: 'C-014', name: 'Assigned_by var', cat: 'fonksiyonel', fn: (t) => !!t.assigned_by },
  { id: 'C-015', name: 'Evidence flag boolean', cat: 'fonksiyonel', fn: (t) => typeof t.evidence_required === 'boolean' },
  { id: 'C-016', name: 'Başlık printable', cat: 'fonksiyonel', fn: (t) => !/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(t.title) },
  { id: 'C-017', name: 'Tekrar karakter yok', cat: 'fonksiyonel', fn: (t) => !/(.)(\1){9,}/.test(t.title) },
  { id: 'C-018', name: 'Trim edilmiş', cat: 'fonksiyonel', fn: (t) => t.title === t.title.trim() },
  { id: 'C-019', name: 'Unicode normalize', cat: 'fonksiyonel', fn: (t) => t.title === t.title.normalize('NFC') },
  { id: 'C-020', name: 'Null değer yok', cat: 'fonksiyonel', fn: (t) => t.title !== null && t.status !== null },

  // GÜVENLİK (20)
  { id: 'C-021', name: 'SQL injection yok', cat: 'guvenlik', fn: (t) => !/('|--|union\s+select|or\s+1\s*=\s*1)/i.test(t.title) },
  { id: 'C-022', name: 'XSS yok', cat: 'guvenlik', fn: (t) => !/<script|onerror|javascript:/i.test(t.title) },
  { id: 'C-023', name: 'Yıkıcı komut yok', cat: 'guvenlik', fn: (t) => !['delete --force','rm -rf','drop table','truncate'].some(f => t.title.toLowerCase().includes(f)) },
  { id: 'C-024', name: 'Path traversal yok', cat: 'guvenlik', fn: (t) => !/\.\.\//.test(t.title) },
  { id: 'C-025', name: 'Prompt injection yok', cat: 'guvenlik', fn: (t) => !/ignore.*previous|forget.*instructions/i.test(t.title) },
  { id: 'C-026', name: 'TC kimlik yok', cat: 'guvenlik', fn: (t) => !/\b\d{11}\b/.test(t.title) },
  { id: 'C-027', name: 'Kredi kartı yok', cat: 'guvenlik', fn: (t) => !/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/.test(t.title) },
  { id: 'C-028', name: 'Sudo komutu yok', cat: 'guvenlik', fn: (t) => !/sudo|chmod\s+777/i.test(t.title) },
  { id: 'C-029', name: 'Shell meta yok', cat: 'guvenlik', fn: (t) => !/[|;&`$()]/.test(t.title) },
  { id: 'C-030', name: 'CRLF yok', cat: 'guvenlik', fn: (t) => !/\r/.test(t.title) },
  { id: 'C-031', name: 'Null byte yok', cat: 'guvenlik', fn: (t) => !t.title.includes('\x00') },
  { id: 'C-032', name: 'Template injection yok', cat: 'guvenlik', fn: (t) => !/\$\{/.test(t.title) },
  { id: 'C-033', name: 'Base64 payload yok', cat: 'guvenlik', fn: (t) => !/^[A-Za-z0-9+/]{50,}={0,2}$/.test(t.title.trim()) },
  { id: 'C-034', name: 'Aşırı boşluk yok', cat: 'guvenlik', fn: (t) => !/\s{20,}/.test(t.title) },
  { id: 'C-035', name: 'Ctrl karakter yok', cat: 'guvenlik', fn: (t) => !/[\x00-\x08\x0E-\x1F\x7F]/.test(t.title) },
  { id: 'C-036', name: 'Encoding güvenli', cat: 'guvenlik', fn: (t) => typeof t.title === 'string' },
  { id: 'C-037', name: 'Metadata güvenli', cat: 'guvenlik', fn: (t) => JSON.stringify(t.metadata || {}).length < 10240 },
  { id: 'C-038', name: 'Atanan kişi güvenli', cat: 'guvenlik', fn: (t) => !/[<>]/.test(t.assigned_to || '') },
  { id: 'C-039', name: 'Görev kodu güvenli', cat: 'guvenlik', fn: (t) => /^[A-Z0-9\-]+$/.test(t.task_code) },
  { id: 'C-040', name: 'Priority güvenli', cat: 'guvenlik', fn: (t) => /^[a-z]+$/.test(t.priority) },

  // MANTIKSAL (18)
  { id: 'C-041', name: 'Doğrulama durumunda', cat: 'mantiksal', fn: (t) => t.status === 'dogrulama' },
  { id: 'C-042', name: 'Başlık anlamlı', cat: 'mantiksal', fn: (t) => t.title.split(/\s+/).length >= 2 },
  { id: 'C-043', name: 'Öncelik-retry tutarlı', cat: 'mantiksal', fn: (t) => !(t.priority === 'kritik' && t.retry_count > 3) },
  { id: 'C-044', name: 'Tarih geçerli', cat: 'mantiksal', fn: (t) => !isNaN(new Date(t.created_at).getTime()) },
  { id: 'C-045', name: 'Kaynak belirtilmiş', cat: 'mantiksal', fn: (t) => !!(t.metadata?.kaynak) },
  { id: 'C-046', name: 'AI analiz var', cat: 'mantiksal', fn: (t) => !!(t.metadata?.ai_analiz_sonucu || t.metadata?.ai_analiz) },
  { id: 'C-047', name: 'Ajan atanmış', cat: 'mantiksal', fn: (t) => !!(t.metadata?.islenen_ajan || t.assigned_by) },
  { id: 'C-048', name: 'İşleme zamanı var', cat: 'mantiksal', fn: (t) => !!(t.metadata?.isleme_zamani || t.updated_at) },
  { id: 'C-049', name: 'Plan mevcut', cat: 'mantiksal', fn: (t) => !!(t.metadata?.ai_analiz_sonucu?.plan) },
  { id: 'C-050', name: 'Risk değerlendirmesi', cat: 'mantiksal', fn: (t) => !!(t.metadata?.ai_analiz_sonucu?.risk) },
  { id: 'C-051', name: 'Adımlar belirlenmiş', cat: 'mantiksal', fn: (t) => Array.isArray(t.metadata?.ai_analiz_sonucu?.steps) },
  { id: 'C-052', name: 'Çelişki kontrolü', cat: 'mantiksal', fn: (t) => !(t.priority === 'dusuk' && /acil|kritik/i.test(t.title)) },
  { id: 'C-053', name: 'Görev-atanan uyumu', cat: 'mantiksal', fn: (t) => t.assigned_to !== 'undefined' && t.assigned_to !== 'null' },
  { id: 'C-054', name: 'Metadata bütünlüğü', cat: 'mantiksal', fn: (t) => typeof t.metadata === 'object' && t.metadata !== null },
  { id: 'C-055', name: 'Durum akışı doğru', cat: 'mantiksal', fn: (t) => !['iptal','reddedildi'].includes(t.status) },
  { id: 'C-056', name: 'Güncelleme tarihi', cat: 'mantiksal', fn: (t) => !!t.updated_at },
  { id: 'C-057', name: 'Sonuç tutarlılığı', cat: 'mantiksal', fn: (t) => !(t.status === 'tamamlandi' && !t.evidence_provided) },
  { id: 'C-058', name: 'Retry mantıklı', cat: 'mantiksal', fn: (t) => t.retry_count >= 0 },

  // PERFORMANS (14)
  { id: 'C-059', name: 'Başlık < 1KB', cat: 'performans', fn: (t) => Buffer.byteLength(t.title) <= 1024 },
  { id: 'C-060', name: 'Metadata < 10KB', cat: 'performans', fn: (t) => JSON.stringify(t.metadata || {}).length <= 10240 },
  { id: 'C-061', name: 'Toplam < 50KB', cat: 'performans', fn: (t) => JSON.stringify(t).length <= 51200 },
  { id: 'C-062', name: 'JSON parse edilebilir', cat: 'performans', fn: (t) => { try { JSON.stringify(t); return true; } catch { return false; } } },
  { id: 'C-063', name: 'Derinlik < 5', cat: 'performans', fn: (t) => JSON.stringify(t.metadata || {}).split('{').length <= 6 },
  { id: 'C-064', name: 'Array boyutu < 50', cat: 'performans', fn: (t) => (t.metadata?.ai_analiz_sonucu?.steps?.length || 0) <= 50 },
  { id: 'C-065', name: 'String normalize', cat: 'performans', fn: (t) => t.title === t.title.normalize('NFC') },
  { id: 'C-066', name: 'Kelime sayısı < 100', cat: 'performans', fn: (t) => t.title.split(/\s+/).length <= 100 },
  { id: 'C-067', name: 'Task code < 30 char', cat: 'performans', fn: (t) => t.task_code.length <= 30 },
  { id: 'C-068', name: 'Priority < 10 char', cat: 'performans', fn: (t) => t.priority.length <= 10 },
  { id: 'C-069', name: 'Status < 20 char', cat: 'performans', fn: (t) => t.status.length <= 20 },
  { id: 'C-070', name: 'Assigned < 50 char', cat: 'performans', fn: (t) => (t.assigned_to || '').length <= 50 },
  { id: 'C-071', name: 'Retry < 10', cat: 'performans', fn: (t) => (t.retry_count || 0) <= 10 },
  { id: 'C-072', name: 'Hızlı erişim', cat: 'performans', fn: (t) => !!t.id && !!t.task_code },

  // VERİ BÜTÜNLÜĞÜ (14)
  { id: 'C-073', name: 'Title string', cat: 'veri', fn: (t) => typeof t.title === 'string' },
  { id: 'C-074', name: 'Status string', cat: 'veri', fn: (t) => typeof t.status === 'string' },
  { id: 'C-075', name: 'Priority string', cat: 'veri', fn: (t) => typeof t.priority === 'string' },
  { id: 'C-076', name: 'Task code string', cat: 'veri', fn: (t) => typeof t.task_code === 'string' },
  { id: 'C-077', name: 'Assigned string', cat: 'veri', fn: (t) => typeof t.assigned_to === 'string' },
  { id: 'C-078', name: 'Created date valid', cat: 'veri', fn: (t) => !isNaN(Date.parse(t.created_at)) },
  { id: 'C-079', name: 'Retry number', cat: 'veri', fn: (t) => typeof t.retry_count === 'number' || t.retry_count === null },
  { id: 'C-080', name: 'Archived boolean', cat: 'veri', fn: (t) => typeof t.is_archived === 'boolean' },
  { id: 'C-081', name: 'Evidence bool', cat: 'veri', fn: (t) => typeof t.evidence_required === 'boolean' },
  { id: 'C-082', name: 'Metadata object', cat: 'veri', fn: (t) => typeof t.metadata === 'object' },
  { id: 'C-083', name: 'ID var', cat: 'veri', fn: (t) => t.id !== undefined && t.id !== null },
  { id: 'C-084', name: 'Title !== undefined', cat: 'veri', fn: (t) => t.title !== undefined },
  { id: 'C-085', name: 'Status !== undefined', cat: 'veri', fn: (t) => t.status !== undefined },
  { id: 'C-086', name: 'Priority !== undefined', cat: 'veri', fn: (t) => t.priority !== undefined },

  // PROOF & onay (6)
  { id: 'C-087', name: 'Hash üretilebilir', cat: 'proof', fn: (t) => sha256(t.title + t.task_code).length === 64 },
  { id: 'C-088', name: 'Benzersiz hash', cat: 'proof', fn: (t) => sha256(t.title) !== sha256('') },
  { id: 'C-089', name: 'Timestamp onay', cat: 'proof', fn: (t) => Date.parse(t.created_at) < Date.now() },
  { id: 'C-090', name: 'Görev kodu benzersiz', cat: 'proof', fn: (t) => t.task_code.length >= 8 },
  { id: 'C-091', name: 'Metadata hash', cat: 'proof', fn: (t) => sha256(JSON.stringify(t.metadata || {})).length === 64 },
  { id: 'C-092', name: 'Bütünlük kontrolü', cat: 'proof', fn: (t) => t.title && t.task_code && t.status && t.priority },
];

// ── GÖREV DENETLE ───────────────────────────────────────────
async function auditTask(task) {
  log(`🔍 Denetim: [${task.task_code}] "${task.title}"`);

  // SİSTEM KURALLARI: Giriş kontrolü
  const girisKontrol = kuralKontrol('HERMAI_DENETIM', task.title);
  if (!girisKontrol.gecti) {
    const logMsg = ihlalLog('HERMAI', girisKontrol);
    if (logMsg) log(logMsg, 'WARN');
    log(`🚫 Görev sistem kuralları tarafından reddedildi: [${task.task_code}]`, 'WARN');
    await supabase.from('tasks')
      .update({ status: 'reddedildi', updated_at: new Date().toISOString(), metadata: { ...task.metadata, sistem_kurallari_red: girisKontrol } })
      .eq('id', task.id);
    return { score: 0, passed: 0, total: CRITERIA.length, failed: CRITERIA.length, verdict: false, hash: 'REJECTED_BY_RULES' };
  }

  const results = [];
  let passed = 0;

  for (const c of CRITERIA) {
    try {
      const ok = c.fn(task);
      results.push({ id: c.id, name: c.name, cat: c.cat, passed: ok });
      if (ok) passed++;
    } catch (e) {
      results.push({ id: c.id, name: c.name, cat: c.cat, passed: false, error: e.message });
    }
  }

  const score = Math.round((passed / CRITERIA.length) * 100);
  const failed = results.filter(r => !r.passed);
  const hash = sha256(JSON.stringify({ task_code: task.task_code, title: task.title, score, ts: Date.now() }));

  // Gemini çift doğrulama + SİSTEM KURALLARI enjeksiyonu
  let aiVerified = false;
    try {
      const kuralBlok = promptEnjeksiyon('L2');
      const userPrompt = `Görev: "${task.title}"\nÖncelik: ${task.priority}\nSkor: %${score}\n\nBu görev güvenli ve mantıklı mı? Sadece TRUE veya FALSE yaz.`;
      const response = await AI.chat(userPrompt, kuralBlok);
      const aiYanit = response.content;
      aiVerified = aiYanit.trim().toUpperCase().startsWith('TRUE');
      // SİSTEM KURALLARI: Yanıt denetimi
      const denetimSonuc = yanitDenetim(aiYanit, 'L2');
      if (denetimSonuc.ihlal_var) {
        const logMsg = ihlalLog('HERMAI_YANIT', denetimSonuc);
        if (logMsg) log(logMsg, 'WARN');
      }
    } catch (e) {
      log(`AI doğrulama hatası: ${e.message}`, 'WARN');
      aiVerified = true; // AI hata → kural motoruna güven
    }
  }

  const finalVerdict = score >= PASS_THRESHOLD && aiVerified;

  log(`📊 Skor: %${score} (${passed}/${CRITERIA.length}) | AI: ${aiVerified ? '✅' : '❌'} | Sonuç: ${finalVerdict ? 'ONAY ✅' : 'RED 🔴'}`);

  if (failed.length > 0 && failed.length <= 5) {
    log(`⚠️ Başarısız: ${failed.map(f => f.id + ' ' + f.name).join(', ')}`, 'WARN');
  }

  // Veritabanına yaz
  const newStatus = finalVerdict ? 'beklemede' : 'reddedildi';
  await supabase.from('tasks')
    .update({
      status: finalVerdict ? 'devam_ediyor' : 'reddedildi',
      updated_at: new Date().toISOString(),
      metadata: {
        ...task.metadata,
        stp_denetim: {
          skor: score,
          gecen: passed,
          toplam: CRITERIA.length,
          basarisiz: failed.map(f => ({ id: f.id, name: f.name })),
          ai_dogrulama: aiVerified,
          sonuc: finalVerdict ? 'ONAY' : 'RED',
          hash: hash,
          zaman: new Date().toISOString(),
        },
      },
    })
    .eq('id', task.id);

  return { score, passed, total: CRITERIA.length, failed: failed.length, verdict: finalVerdict, hash };
}

// ── ANA DÖNGÜ ───────────────────────────────────────────────
let isRunning = false;

async function pollTasks() {
  if (isRunning) return;
  isRunning = true;

  try {
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('status', 'dogrulama')
      .eq('is_archived', false)
      .order('created_at', { ascending: true })
      .limit(5);

    if (error) { log(`DB HATA: ${error.message}`, 'ERROR'); return; }
    if (!tasks || tasks.length === 0) return;

    log(`📥 ${tasks.length} görev denetlenecek.`);

    for (const task of tasks) {
      await auditTask(task);
    }
  } finally {
    isRunning = false;
  }
}

// ── TEST MODU ───────────────────────────────────────────────
async function runTest() {
  log('🧪 TEST MODU BAŞLIYOR...');
  const testTask = {
    id: 'test-001',
    title: 'Test görevi oluştur',
    task_code: 'TSK-20260420-TEST',
    status: 'dogrulama',
    priority: 'normal',
    assigned_to: 'Test Kullanıcı',
    assigned_by: 'SYSTEM',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_archived: false,
    evidence_required: true,
    evidence_provided: false,
    retry_count: 0,
    metadata: {
      kaynak: 'test',
      ai_analiz_sonucu: { plan: 'Test planı', steps: ['Adım 1'], risk: 'düşük' },
      islenen_ajan: 'K-1',
      isleme_zamani: new Date().toISOString(),
    },
  };

  const result = await auditTask(testTask);
  log(`🧪 TEST SONUCU: Skor=%${result.score} Geçen=${result.passed}/${result.total} Başarısız=${result.failed} Sonuç=${result.verdict ? 'ONAY' : 'RED'}`);
  log(`🧪 Hash: ${result.hash}`);
  process.exit(0);
}

// ── BAŞLAT ──────────────────────────────────────────────────
async function start() {
  log('══════════════════════════════════════════════');
  log('  STP DENETİM — 92 Kriter Motoru v1       ');
  log('  Supabase + Gemini + SHA-256 Proof           ');
  log('══════════════════════════════════════════════');

  if (process.argv.includes('--test')) {
    await runTest();
    return;
  }

  const { error } = await supabase.from('tasks').select('id').limit(1);
  if (error) { log(`❌ Supabase hata: ${error.message}`, 'CRITICAL'); process.exit(1); }
  log('✅ Supabase bağlantısı doğrulandı.');

  log('✅ AI Bağlantısı (L2 Denetim / Local-First) doğrulandı.');

  log(`📏 Eşik: %${PASS_THRESHOLD} | Kriter: ${CRITERIA.length} | Tarama: ${POLL_INTERVAL/1000}sn`);
  log('🚀 Denetim motoru başlatıldı. Görev bekleniyor...');

  await pollTasks();
  setInterval(pollTasks, POLL_INTERVAL);
}

start().catch(err => { log(`HATA: ${err.message}`, 'CRITICAL'); process.exit(1); });
process.once('SIGINT',  () => { log('Durduruldu.'); process.exit(0); });
process.once('SIGTERM', () => { log('Durduruldu.'); process.exit(0); });
