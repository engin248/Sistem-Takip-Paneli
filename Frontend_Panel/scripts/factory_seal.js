/* eslint-disable */
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function sealFactory() {
  console.log('--- SİSTEM MÜHÜRLEME BAŞLADI ---');

  // .env.local dosyasını oku
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('Hata: .env.local bulunamadı.');
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const env = {};
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim().replace(/"/g, '');
  });

  const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
  const supabaseKey = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

  if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('your-project')) {
    console.warn('⚠️ Uyarı: Supabase kimlik bilgileri eksik veya geçersiz. Log mühürlenemedi.');
    console.log('Build başarılı sayıldı (Simülasyon).');
    process.exit(0);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const logEntry = {
    log_code: `LOG-FACTORY-${Date.now()}`,
    operation_type: 'SYSTEM',
    action_description: 'SİSTEM FABRİKADAN ÇIKTI: Üretim derlemesi başarıyla tamamlandı ve mühürlendi.',
    status: 'basarili',
    performed_by: 'CI/CD-BOT'
  };

  const { error } = await supabase.from('audit_logs').insert([logEntry]);

  if (error) {
    console.error('Mühürleme hatası:', error.message);
    process.exit(1);
  }

  console.log('✅ SİSTEM FABRİKADAN ÇIKTI: İşlem audit_logs tablosuna mühürlendi.');
}

sealFactory();
