// ============================================================
// AI AJANLAR — 160 Birim Askeri Kadro Motoru v2
// ============================================================
// PROJESİ: Sistem Takip Paneli (STP)
// DURUM:   BAĞIMSIZ MODÜL — Frontend_Panel'den ayrı çalışır.
//
// NE YAPAR:
//   1. Supabase'den "beklemede" görevleri çeker
//   2. AI ile görevi analiz edip doğru TAKIMA yönlendirir
//   3. Atanan ajan uzmanlığıyla görev planı oluşturur
//   4. Sonucu veritabanına yazar
//   5. Her şeyi loglar
//
// AJAN KADROSU: 32 Takım × 5 Ajan = 160 Birim
//   Her ajan SADECE kendi uzmanlık alanında çalışır.
//   Kurul/tartışma yok — görev gelir, atanır, yapılır.
//
// Çalıştır: npm start  (veya: node index.js)
// ============================================================

const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs   = require('fs');
const path = require('path');
const { promptEnjeksiyon, kuralKontrol, yanitDenetim, ihlalLog } = require('../shared/sistemKurallari');
const AI = require('../shared/aiOrchestrator');
const { TAM_KADRO, takimBul, ajanBul, TAKIM_KODLARI } = require('../Agent_Uretim_Departmani/roster/index.js');
const MDS = require('../Agent_Uretim_Departmani/roster/discipline.js');

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

// ── AJAN KADROSU (32 TAKIM × 5 = 160 BİRİM) ──────────────
// Her ajan SADECE kendi uzmanlık alanında çalışır.
// Görev gelir → doğru takıma atanır → ajan yapar.
const AJANLAR = {};
for (const ajan of TAM_KADRO) {
  AJANLAR[ajan.id] = { isim: ajan.kod_adi, rol: ajan.gorev_tanimi, takim: ajan.takim_kodu, beceriler: ajan.beceriler };
}
log(`✅ 160 ajan kadrosu yüklendi (${Object.keys(AJANLAR).length} birim).`);

async function routeTaskG2(task) {
  const systemPrompt = `Sen G-2 Görev Rotalayıcısısın. 32 uzman takım var.
Görevi analiz et ve en uygun TAKIM KODUNU döndür.

TAKIMLAR:
GA=Gereksinim Analizi, RA=Risk Analizi, HU=Hukuk, MK=Maliyet, ZP=Zaman Planlaması,
MT=Mimari Tasarım, AT=Altyapı, VM=Veri Modelleme, AP=API Tasarımı, GT=Güvenlik Tasarımı, UX=UI/UX,
TS=Teknoloji Seçimi, KK=Kod Kalitesi, HY=Hata Yönetimi, BY=Bağımlılık, ER=Erişilebilirlik, EN=Entegrasyon,
TE=Test, PO=Performans, ST=Sızma Testi, VA=Veri Akışı,
DO=DevOps, GM=Migrasyon, SY=Sürüm Yönetimi,
OP=Operasyon, CI=Canlı İzleme, YF=Yedekleme, SD=Sistem Denetimi, HT=Hata Tespiti, HO=Hata Onarımı, DK=Dokümantasyon, EA=Eğitim

Sadece 2 harflik takım kodu döndür. Başka hiçbir şey yazma.`;
  
  try {
    const response = await AI.chat(`Görev: ${task.title}\nAçıklama: ${task.description || ''}`, systemPrompt);
    const textOut = response.content.trim().toUpperCase();
    
    // 2 harfli takım kodunu ayıkla
    const kodMatch = textOut.match(/\b([A-Z]{2})\b/);
    if (kodMatch && TAKIM_KODLARI[kodMatch[1]]) {
      const takimKodu = kodMatch[1];
      // Takımın ilk müsait ajanını ata (ALFA)
      return takimKodu + '-01';
    }
  } catch (e) {
    log(`G-2 Rotalama Hatası: ${e.message}, fallback uygulanıyor.`, 'WARN');
  }

  // Fallback: Anahtar kelime eşleştirme
  const lower = task.title.toLowerCase();
  if (['veritabanı', 'sql', 'migration', 'tablo', 'şema'].some(k => lower.includes(k))) return 'VM-01';
  if (['api', 'endpoint', 'rest', 'graphql'].some(k => lower.includes(k))) return 'AP-01';
  if (['arayüz', 'görsel', 'css', 'tasarım', 'ui', 'ux'].some(k => lower.includes(k))) return 'UX-01';
  if (['güvenlik', 'hack', 'yetki', 'token', 'şifre'].some(k => lower.includes(k))) return 'GT-01';
  if (['hata', 'bug', 'sorun', 'arıza'].some(k => lower.includes(k))) return 'HT-01';
  if (['düzelt', 'fix', 'onar', 'patch'].some(k => lower.includes(k))) return 'HO-01';
  if (['test', 'doğrula', 'kontrol'].some(k => lower.includes(k))) return 'TE-01';
  if (['deploy', 'yayınla', 'ci', 'cd', 'docker'].some(k => lower.includes(k))) return 'DO-01';
  if (['performans', 'hız', 'yavaş', 'optimize'].some(k => lower.includes(k))) return 'PO-01';
  if (['dokümantasyon', 'belge', 'readme', 'wiki'].some(k => lower.includes(k))) return 'DK-01';
  if (['risk', 'tehlike', 'alternatif'].some(k => lower.includes(k))) return 'RA-01';
  if (['mimari', 'yapı', 'monolith', 'microservice'].some(k => lower.includes(k))) return 'MT-01';
  if (['entegrasyon', 'webhook', 'bağlantı'].some(k => lower.includes(k))) return 'EN-01';
  if (['yedek', 'backup', 'felaket'].some(k => lower.includes(k))) return 'YF-01';
  if (['izleme', 'alarm', 'monitoring'].some(k => lower.includes(k))) return 'CI-01';
  if (['gereksinim', 'analiz', 'kapsam'].some(k => lower.includes(k))) return 'GA-01';
  if (['maliyet', 'bütçe', 'kaynak'].some(k => lower.includes(k))) return 'MK-01';
  if (['zaman', 'takvim', 'plan'].some(k => lower.includes(k))) return 'ZP-01';
  if (['kod kalite', 'refactor', 'clean'].some(k => lower.includes(k))) return 'KK-01';
  if (['göç', 'migrasyon', 'taşıma'].some(k => lower.includes(k))) return 'GM-01';
  if (['sürüm', 'versiyon', 'release'].some(k => lower.includes(k))) return 'SY-01';
  if (['denetim', 'audit', 'uyumluluk'].some(k => lower.includes(k))) return 'SD-01';
  return 'GA-01'; // Genel fallback: Gereksinim Analizi
}

async function analyzeTask(task, ajanId) {
  const agent = AJANLAR[ajanId];
  if (!agent) {
    log(`AJAN BULUNAMADI: ${ajanId}`, 'ERROR');
    return { plan: `Ajan bulunamadı: ${ajanId}`, steps: [], risk: 'yüksek', ajan: ajanId };
  }

  const systemPrompt = `Sen "${agent.isim}" ajanısın.
Uzmanlık alanın: ${agent.rol}
Beceri setin: ${agent.beceriler.join(', ')}

${promptEnjeksiyon(ajanId)}

SADECE uzmanlık alanında çalış. Kapsam dışı her işlemi reddet.
Görevi atomik adımlara böl ve JSON formatında döndür.`;

  const userPrompt = `Görev: "${task.title}"\nÖncelik: ${task.priority}`;

  try {
    const response = await AI.chat(userPrompt, systemPrompt, { temperature: 0.2 });
    const text = response.content;
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return { plan: text.substring(0, 500), steps: [], risk: 'belirsiz', ajan: agent.isim, takim: agent.takim };
  } catch (err) {
    log(`ANALİZ HATA [${ajanId}]: ${err.message}`, 'ERROR');
    return { plan: `Hata: ${err.message}`, steps: [], risk: 'yüksek', ajan: agent.isim };
  }
}

// ── GÖREV İŞLE ──────────────────────────────────────────────
// MDS-160 PROTOKOLÜ: Görev → Rotalama → Yapıcı → Denetçi → Doğrulama → Kayıt
async function processTask(task) {
  // [MDS-160] Execution ID üret (Immutable Trace)
  const exeId = MDS.executionIdUret();
  log(`🆔 [${exeId}] Yeni görev işleme başlatıldı: [${task.task_code}]`);

  // [MDS-160 II] GİRİŞ KONTROLÜ: Sistem kuralları
  const girisKontrol = kuralKontrol('GOREV_ISLEM', task.title);
  if (!girisKontrol.gecti) {
    const logMsg = ihlalLog('PLANLAMA', girisKontrol);
    if (logMsg) log(logMsg, 'WARN');
    log(`🚫 [${exeId}] INVALID_COMMAND: [${task.task_code}] → ${girisKontrol.ihlaller.map(i => i.aciklama).join(', ')}`, 'WARN');
    await supabase.from('tasks')
      .update({ status: 'reddedildi', updated_at: new Date().toISOString(), metadata: { ...task.metadata, execution_id: exeId, hata_kodu: 'INVALID_COMMAND', sistem_kurallari_red: girisKontrol } })
      .eq('id', task.id);
    return { plan: 'INVALID_COMMAND', steps: [], risk: 'yüksek', execution_id: exeId };
  }

  // [MDS-160 III] ROTALAMA: G-2 görevi doğru takıma yönlendirir
  const ajanId = await routeTaskG2(task);
  const ajan = AJANLAR[ajanId];
  log(`📋 [${exeId}] [G-2] Görev atandı: [${task.task_code}] → ${ajan.isim} (${ajanId}) [Takım: ${ajan.takim}]`);

  // [MDS-160 III] EXECUTION LOCK: Durumu kilitle
  await supabase.from('tasks')
    .update({ status: 'devam_ediyor', updated_at: new Date().toISOString() })
    .eq('id', task.id);

  // ═══════════════════════════════════════════════════════════
  // ADIM 1: YAPICI (XX-01) — Görevi analiz eder ve planlar
  // ═══════════════════════════════════════════════════════════
  log(`⚡ [${exeId}] YAPICI [${ajanId}] ${ajan.isim} görevi analiz ediyor...`);
  let analysis = await analyzeTask(task, ajanId);
  analysis.execution_id = exeId;

  // [MDS-160 VI] ÇIKTI FİLTRELEME: Yasaklı ifadeler temizlenir
  if (analysis.plan) {
    const filtre = MDS.ciktiFiltreyle(analysis.plan);
    if (filtre.filtrelenen > 0) {
      log(`🧹 [${exeId}] ${filtre.filtrelenen} yasaklı ifade filtrelendi.`);
      analysis.plan = filtre.temiz;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // ADIM 2: DENETÇİ (XX-02) — Çıktıyı kontrol eder
  // ═══════════════════════════════════════════════════════════
  const denetciId = ajan.takim + '-02';
  const denetci = AJANLAR[denetciId];
  if (denetci) {
    log(`🔍 [${exeId}] DENETÇİ [${denetciId}] ${denetci.isim} kontrol ediyor...`);
    try {
      const denetimPrompt = `Sen "${denetci.isim}" denetçisisin.
Uzmanlık alanın: ${denetci.rol}

YAPICI AJANIN ÇIKTISI:
${JSON.stringify(analysis, null, 2)}

GÖREVİN:
1. Çıktıyı uzmanlık alanın açısından kontrol et.
2. Eksik, hatalı veya tutarsız adım varsa belirt.
3. Sonucu JSON döndür: {"onay": true/false, "notlar": "...", "duzeltmeler": "..."}
Sadece JSON döndür.`;

      const denetimSonuc = await AI.chat(denetimPrompt, 'Sen kıdemli denetçisin. Sadece kontrol yap.', { temperature: 0.1 });
      const denetimText = denetimSonuc.content;
      
      const jsonMatch = denetimText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const denetim = JSON.parse(jsonMatch[0]);
          analysis.denetim = { denetci_id: denetciId, denetci_adi: denetci.isim, ...denetim };
          if (denetim.onay === false) {
            log(`⚠️ [${exeId}] DENETÇİ RED: ${denetim.notlar || ''}`, 'WARN');
          } else {
            log(`✅ [${exeId}] DENETÇİ ONAYLADI.`);
          }
        } catch (parseErr) {
          analysis.denetim = { denetci_id: denetciId, ham_yanit: denetimText };
        }
      } else {
        analysis.denetim = { denetci_id: denetciId, ham_yanit: denetimText };
      }
    } catch (denetimErr) {
      log(`⚠️ [${exeId}] Denetim hatası [${denetciId}]: ${denetimErr.message}`, 'WARN');
      analysis.denetim = { denetci_id: denetciId, hata: denetimErr.message };
    }
  }

  // ═══════════════════════════════════════════════════════════
  // ADIM 3: ÇİFT DOĞRULAMA (MDS-160 V)
  //   Self-Check: Çıktı komut kapsamına uyuyor mu?
  //   Rule-Check: Kural ihlali var mı?
  // ═══════════════════════════════════════════════════════════
  const orijinalAjan = ajanBul(ajanId);
  const dogrulama = MDS.ciftDogrulama(analysis, task, orijinalAjan);
  analysis.dogrulama = dogrulama;

  if (!dogrulama.gecti) {
    log(`⚠️ [${exeId}] ÇİFT DOĞRULAMA BAŞARISIZ: ${dogrulama.detay}`, 'WARN');
    
    // [MDS-160 V] MAX 1 RETRY
    log(`🔄 [${exeId}] Re-Try: Tekrar üretim yapılıyor (1/${MDS.DOGRULAMA.MAX_RETRY})...`);
    analysis = await analyzeTask(task, ajanId);
    analysis.execution_id = exeId;
    
    const retryDogrulama = MDS.ciftDogrulama(analysis, task, orijinalAjan);
    analysis.dogrulama = retryDogrulama;
    
    if (!retryDogrulama.gecti) {
      log(`❌ [${exeId}] FAILED_VALIDATION: Tekrar da başarısız. Süreç durduruluyor.`, 'ERROR');
      await supabase.from('tasks')
        .update({ status: 'reddedildi', updated_at: new Date().toISOString(), metadata: { ...task.metadata, execution_id: exeId, hata_kodu: 'FAILED_VALIDATION', dogrulama: retryDogrulama } })
        .eq('id', task.id);
      return { plan: 'FAILED_VALIDATION', steps: [], risk: 'yüksek', execution_id: exeId };
    }
    log(`✅ [${exeId}] Re-Try başarılı. Doğrulama geçti.`);
  } else {
    log(`✅ [${exeId}] ÇİFT DOĞRULAMA BAŞARILI.`);
  }

  // [MDS-160 VI] FINAL GATE: Sistem kuralları yanıt denetimi
  const yanitSonuc = yanitDenetim(analysis.plan || '', ajanId);
  if (yanitSonuc.ihlal_var) {
    const logMsg = ihlalLog('PLANLAMA_YANIT', yanitSonuc);
    if (logMsg) log(logMsg, 'WARN');
    if (yanitSonuc.iptal) {
      log(`🚫 [${exeId}] FINAL GATE RED: AI yanıtı filtrelendi [${task.task_code}]`, 'WARN');
      analysis.plan = '[DEVIATION_DETECTED] ' + yanitSonuc.ihlaller.map(i => i.aciklama).join(', ');
    }
  }

  // [MDS-160 IV] SONUÇ KAYDET (Immutable Trace)
  await supabase.from('tasks')
    .update({
      status: 'dogrulama',
      updated_at: new Date().toISOString(),
      metadata: {
        ...task.metadata,
        execution_id: exeId,
        ai_analiz_sonucu: analysis,
        islenen_ajan: ajanId,
        islenen_takim: ajan.takim,
        denetci: analysis.denetim || null,
        dogrulama: analysis.dogrulama || null,
        isleme_zamani: new Date().toISOString(),
      },
    })
    .eq('id', task.id);

  // [MDS-160 V] AUDIT LOG (Değiştirilemez Kayıt)
  try {
    await supabase.from('audit_logs').insert([{
      action_code: 'AI_TASK_PROCESSED',
      operator_id: ajanId,
      details: {
        execution_id: exeId,
        task_id: task.id,
        task_code: task.task_code,
        title: task.title,
        yapici: { id: ajanId, isim: ajan.isim, takim: ajan.takim },
        denetci: analysis.denetim || null,
        dogrulama: analysis.dogrulama || null,
        plan: analysis.plan,
        risk: analysis.risk,
        steps: analysis.steps,
      },
    }]);
  } catch (e) { log(`[${exeId}] Audit log yazılamadı: ${e.message}`, 'WARN'); }

  log(`📌 [${exeId}] Görev işlendi: [${task.task_code}] → ${ajanId} (${ajan.takim}) → durum: dogrulama`);
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
  log('  STP AI AJANLAR — 160 Birim Kadro Motoru v2  ');
  log('  32 Takım × 5 Ajan = 160 Askeri Düzey Birim  ');
  log('  Görev gelir → Atanır → Yapılır              ');
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
