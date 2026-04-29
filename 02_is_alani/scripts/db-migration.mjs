/**
 * STP Veritabanı Migrasyon Scripti
 * Supabase REST API üzerinden audit_logs şemasını düzeltir
 * 
 * Çalıştırma: node scripts/db-migration.mjs
 */

const SUPABASE_URL = 'https://tesxmqhkegotxenoljzl.supabase.co';
const ANON_KEY = 'sb_publishable_FYhWLJHf1XdutwfYFnaZhQ_l9gbc8Nm';

const headers = {
  'apikey': ANON_KEY,
  'Authorization': `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
};

async function testConnection() {
  console.log('─── BAĞLANTI TESTİ ───');
  const r = await fetch(`${SUPABASE_URL}/rest/v1/tasks?select=id,title,priority&limit=5`, { headers });
  const data = await r.json();
  console.log(`Tasks tablosu: ${data.length} kayıt`);
  data.forEach(t => console.log(`  → ${t.title} | priority=${t.priority}`));
  return data;
}

async function testAuditLogs() {
  console.log('\n─── AUDIT_LOGS DURUM ───');
  const r = await fetch(`${SUPABASE_URL}/rest/v1/audit_logs?select=*&limit=3`, { headers });
  if (!r.ok) {
    const err = await r.json();
    console.log(`HATA: ${r.status} — ${err.message}`);
    return null;
  }
  const data = await r.json();
  console.log(`audit_logs: ${data.length} kayıt`);
  if (data.length > 0) {
    console.log('Alanlar:', Object.keys(data[0]).join(', '));
  }
  return data;
}

async function fixPriority() {
  console.log('\n─── PRIORITY DÜZELTMESİ ───');
  // "high" değerini "yuksek" ile değiştir
  const r = await fetch(`${SUPABASE_URL}/rest/v1/tasks?priority=eq.high`, {
    method: 'PATCH',
    headers: { ...headers, 'Prefer': 'return=representation' },
    body: JSON.stringify({ priority: 'yuksek' }),
  });
  
  if (r.ok) {
    const data = await r.json();
    console.log(`Düzeltilen kayıt: ${data.length}`);
    return data;
  } else {
    const err = await r.text();
    console.log(`HATA: ${r.status} — ${err}`);
    
    // CHECK constraint varsa rapor et
    if (err.includes('check') || err.includes('constraint')) {
      console.log('→ CHECK constraint mevcut. tasks tablosunda "high" değerine izin verilmiyor.');
      console.log('→ Bu değer constraint EKLENMEDEN ÖNCE girilmiş olabilir.');
      console.log('→ SQL Editor ile düzeltilmesi gerekiyor: UPDATE tasks SET priority = \'yuksek\' WHERE priority = \'high\';');
    }
    return null;
  }
}

async function checkAllTables() {
  console.log('\n─── TABLO KONTROLÜ ───');
  const tables = ['tasks', 'audit_logs', 'board_decisions', 'file_locks', 'self_learning_logs'];
  
  for (const tablo of tables) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${tablo}?select=*&limit=0`, { headers });
    const status = r.ok ? '✅ MEVCUT' : `❌ YOK (${r.status})`;
    console.log(`  ${tablo}: ${status}`);
  }
}

async function checkAuditSchema() {
  console.log('\n─── AUDIT_LOGS ŞEMA ANALİZİ ───');
  const r = await fetch(`${SUPABASE_URL}/rest/v1/audit_logs?select=*&limit=1`, { headers });
  if (!r.ok) {
    console.log('Tablo erişilemez');
    return;
  }
  const data = await r.json();
  if (data.length > 0) {
    const alanlar = Object.keys(data[0]);
    console.log(`Toplam alan: ${alanlar.length}`);
    console.log(`Alanlar: ${alanlar.join(', ')}`);
    
    // Beklenen alanlar
    const beklenen = ['id', 'log_code', 'operation_type', 'action_description', 'performed_by', 'status', 'error_code', 'error_severity', 'created_at', 'metadata'];
    const eksik = beklenen.filter(a => !alanlar.includes(a));
    const fazla = alanlar.filter(a => !beklenen.includes(a) && !['task_id', 'table_name', 'record_id', 'action_location', 'action_output', 'action_evidence', 'error_type', 'authorized_by', 'is_verified', 'verified_by', 'verified_at', 'execution_duration_ms', 'is_sealed', 'old_data', 'new_data'].includes(a));
    
    if (eksik.length > 0) {
      console.log(`\n⚠️  EKSİK ALANLAR (kod beklentisi): ${eksik.join(', ')}`);
      console.log('→ audit_logs tablosu ESKİ şemayla oluşturulmuş');
      console.log('→ migration_fix_20260410.sql çalıştırılmalı');
    } else {
      console.log('\n✅ Tüm beklenen alanlar mevcut');
    }
  }
}

async function writeTestAudit() {
  console.log('\n─── AUDIT LOG YAZMA TESTİ ───');
  
  // Eski şema formatında dene
  const eskiFormat = {
    action_code: 'MIGRATION_TEST',
    details: { test: true, timestamp: new Date().toISOString() },
  };
  
  const r1 = await fetch(`${SUPABASE_URL}/rest/v1/audit_logs`, {
    method: 'POST',
    headers: { ...headers, 'Prefer': 'return=representation' },
    body: JSON.stringify(eskiFormat),
  });
  
  if (r1.ok) {
    console.log('→ ESKİ ŞEMA ile yazma BAŞARILI (action_code, details formatı)');
    console.log('→ Bu tablo eski şemayla çalışıyor — migrasyon GEREKLİ');
    return 'eski';
  }
  
  // Yeni şema formatında dene
  const yeniFormat = {
    log_code: 'LOG-TEST-MIGRATION',
    operation_type: 'SYSTEM',
    action_description: 'Migrasyon testi',
    performed_by: 'MIGRATION_SCRIPT',
  };
  
  const r2 = await fetch(`${SUPABASE_URL}/rest/v1/audit_logs`, {
    method: 'POST',
    headers: { ...headers, 'Prefer': 'return=representation' },
    body: JSON.stringify(yeniFormat),
  });
  
  if (r2.ok) {
    console.log('→ YENİ ŞEMA ile yazma BAŞARILI');
    console.log('→ Tablo doğru şemayla çalışıyor ✅');
    return 'yeni';
  }
  
  const err1 = await r1.text();
  const err2 = await r2.text();
  console.log(`Eski format hatası: ${err1}`);
  console.log(`Yeni format hatası: ${err2}`);
  return 'hata';
}

// ─── ANA İŞLEM ───
(async () => {
  try {
    await testConnection();
    await checkAllTables();
    await testAuditLogs();
    await checkAuditSchema();
    const sema = await writeTestAudit();
    await fixPriority();
    
    console.log('\n═══════════════════════════════════');
    console.log('SONUÇ:');
    console.log(`  audit_logs şeması: ${sema === 'eski' ? '❌ ESKİ — MİGRASYON GEREKLİ' : sema === 'yeni' ? '✅ DOĞRU' : '⚠️ BELİRSİZ'}`);
    console.log('═══════════════════════════════════');
  } catch (e) {
    console.error('KRİTİK HATA:', e.message);
  }
})();
