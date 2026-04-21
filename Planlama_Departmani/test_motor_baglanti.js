const AI = require('../shared/aiOrchestrator');
const fs = require('fs');
const path = require('path');

// Env Loader
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
       const key = trimmed.slice(0, eqIdx).trim();
       if (!process.env[key]) process.env[key] = trimmed.slice(eqIdx + 1).trim();
    }
  }
}

const AJANLAR = {
  'K-1':  { isim: 'Stratejist' },
  'K-2':  { isim: 'Analist' },
  'A-01': { isim: 'İcracı-Frontend' },
  'A-02': { isim: 'İcracı-Backend' },
  'A-03': { isim: 'İcracı-DB' },
  'A-04': { isim: 'İcracı-Güvenlik' },
  'A-05': { isim: 'İcracı-Entegrasyon' },
  'A-06': { isim: 'İcracı-DevOps' },
  'A-07': { isim: 'İcracı-Tasarım' },
  'L-1':  { isim: 'Hata Ayıklayıcı' },
  'L-2':  { isim: 'Sistem Denetçisi' },
  'L-3':  { isim: 'Güvenlik Denetçisi' },
  'L-4':  { isim: 'Performans Optimizatörü' },
  'G-8':  { isim: 'Arşiv Uzmanı' }
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
    
    const idMatch = textOut.match(/([KkAaLlGg]-\d{1,2})/);
    if (idMatch) {
        const ajanId = idMatch[1].toUpperCase();
        if (AJANLAR[ajanId]) return ajanId;
    }
  } catch (e) {
    console.log(`G-2 Rotalama Hatası: ${e.message}`);
  }

  const lower = task.title.toLowerCase();
  if (['veritabanı', 'sql', 'migration', 'supabase'].some(k => lower.includes(k))) return 'A-03';
  if (['api', 'webhook', 'servis'].some(k => lower.includes(k))) return 'A-05';
  if (['arayüz', 'görsel', 'css', 'tasarım'].some(k => lower.includes(k))) return 'A-07';
  if (['güvenlik', 'hack', 'yetki', 'token'].some(k => lower.includes(k))) return 'A-04';
  if (['hata', 'bug', 'düzelt'].some(k => lower.includes(k))) return 'L-1';
  if (['denetle', 'kontrol', 'test'].some(k => lower.includes(k))) return 'L-2';
  return 'A-02'; 
}

async function runTests() {
   const testCases = [
     { title: "Kullanıcı Şifrelerini Güvence Altına Alma ve Sızma Testi", description: "JWT doğrulaması kırılmış olabilir. Test atın ve güvenlik risklerini denetleyin." },
     { title: "Yeni React Component Yazılması", description: "Müşteri listesi tablosunu TailwindCSS ile güncelleyin." },
     { title: "Aylık Rapor Loglarının Sürekli Şişmesi", description: "Geçmiş log geçmişini arşive alıp projeyi mühürleyin." },
     { title: "Telegram API bağlantı sorunu", description: "Mesajlar webhook'a düşmüyor dış api entegrasyonuna bak." }
   ];

   console.log("==========================================");
   console.log("   G-2 15 KANALLI MOTOR TEST PROTOKOLÜ    ");
   console.log("==========================================\\n");

   for (const task of testCases) {
       console.log(`[TEST]: "${task.title}"`);
       const assignedId = await routeTaskG2(task);
       console.log(`[SONUÇ]: Yönlendirilen Motor -> ${assignedId} (${AJANLAR[assignedId] ? AJANLAR[assignedId].isim : 'Bilinmeyen'})\\n---`);
       // Prevent rate limit issues
       await new Promise(r => setTimeout(r, 1000));
   }
}

runTests();
