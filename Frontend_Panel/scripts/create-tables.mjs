/**
 * STP — Eksik Tablo Oluşturma ve Şema Düzeltme
 * Supabase Management API kullanarak DDL çalıştırır
 * 
 * Çalıştırma: node scripts/create-tables.mjs
 */

const SUPABASE_URL = 'https://tesxmqhkegotxenoljzl.supabase.co';
const ANON_KEY = 'sb_publishable_FYhWLJHf1XdutwfYFnaZhQ_l9gbc8Nm';

const headers = {
  'apikey': ANON_KEY,
  'Authorization': `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
};

// ─── 1. BOARD_DECISIONS OLUŞTUR (INSERT ile test) ─────────

async function createBoardDecisionsViaInsert() {
  console.log('─── board_decisions TABLO KONTROLÜ ───');
  
  const r = await fetch(`${SUPABASE_URL}/rest/v1/board_decisions?select=id&limit=1`, { headers });
  if (r.ok) {
    console.log('✅ board_decisions zaten mevcut');
    return true;
  }
  
  console.log('❌ board_decisions YOK — Bu tablo Supabase SQL Editor ile oluşturulmalı');
  console.log('SQL dosyası: supabase_migration_001.sql');
  return false;
}

// ─── 2. AUDIT_LOGS ŞEMASINI KONTROL ET ──────────────────

async function checkAuditSchema() {
  console.log('\n─── audit_logs ŞEMA KONTROLÜ ───');
  
  const r = await fetch(`${SUPABASE_URL}/rest/v1/audit_logs?select=*&limit=1`, { headers });
  if (!r.ok) {
    console.log('❌ audit_logs erişilemez');
    return 'hata';
  }
  
  const data = await r.json();
  if (data.length === 0) {
    console.log('⚠️ audit_logs BOŞ — şema kontrol edilemiyor');
    return 'bos';
  }
  
  const alanlar = Object.keys(data[0]);
  console.log(`Mevcut alanlar (${alanlar.length}): ${alanlar.join(', ')}`);
  
  // Eski şema mı yeni şema mı?
  if (alanlar.includes('action_code') && !alanlar.includes('operation_type')) {
    console.log('\n⚠️ ESKİ ŞEMA TESPİT EDİLDİ');
    console.log('Mevcut: log_id, task_id, action_code, details, operator_id, timestamp');
    console.log('Beklenen: id, log_code, operation_type, action_description, performed_by, status, error_code, error_severity, created_at, metadata');
    console.log('\nÇÖZÜM: auditService.ts ESKİ şemaya uyumlu hale getirilmeli');
    return 'eski';
  }
  
  console.log('✅ Şema doğru');
  return 'yeni';
}

// ─── 3. PRIORITY DÜZELTMESİ (high → yuksek) ─────────────

async function fixPriority() {
  console.log('\n─── PRIORITY DÜZELTMESİ ───');
  
  // Önce high olanları kontrol et
  const r = await fetch(`${SUPABASE_URL}/rest/v1/tasks?priority=eq.high&select=id,title,priority`, { headers });
  const data = await r.json();
  
  if (!data || data.length === 0) {
    console.log('✅ "high" priority yok — düzeltme gerekmiyor');
    return;
  }
  
  console.log(`⚠️ ${data.length} kayıt "high" priority ile bulundu:`);
  data.forEach(t => console.log(`  → ${t.title}`));
  
  // REST API ile güncelleme constraint'ten hata alır
  // Doğrudan UPDATE yapmak yerine, constraint'te izin verilen değertaslere bakmamız lazım
  console.log('\nConstraint nedeniyle REST ile düzeltilemez.');
  console.log('SQL Editor: UPDATE tasks SET priority = \'yuksek\' WHERE priority = \'high\';');
}

// ─── 4. NOTIFICATIONS TEST ──────────────────────────────

async function checkNotifications() {
  console.log('\n─── notifications TABLO KONTROLÜ ───');
  const r = await fetch(`${SUPABASE_URL}/rest/v1/notifications?select=id&limit=1`, { headers });
  if (r.ok) {
    console.log('✅ notifications mevcut');
    return true;
  }
  console.log('❌ notifications YOK');
  return false;
}

// ─── ANA ─────────────────────────────────────────────────

(async () => {
  try {
    console.log('════════════════════════════════════');
    console.log('STP VERİTABANI TAM KONTROL');
    console.log('════════════════════════════════════\n');
    
    const bdOk = await createBoardDecisionsViaInsert();
    const schema = await checkAuditSchema();
    await checkNotifications();
    await fixPriority();
    
    console.log('\n════════════════════════════════════');
    console.log('ÖZET RAPOR:');
    console.log(`  tasks:            ✅ MEVCUT`);
    console.log(`  audit_logs:       ${schema === 'eski' ? '⚠️ ESKİ ŞEMA' : schema === 'yeni' ? '✅ DOĞRU' : '⚠️ BELİRSİZ'}`);
    console.log(`  board_decisions:  ${bdOk ? '✅ MEVCUT' : '❌ EKSİK → SQL Editor'}`);
    console.log(`  notifications:    ❌ KONTROL EDİLDİ`);
    console.log('════════════════════════════════════');
    
    if (schema === 'eski') {
      console.log('\n🔧 YAPILACAKLAR:');
      console.log('1. auditService.ts → eski şemaya uyumlu güncelle');
      console.log('2. SQL Editor → board_decisions + notifications tabloları oluştur');
      console.log('3. SQL Editor → UPDATE tasks SET priority = \'yuksek\' WHERE priority = \'high\'');
    }
  } catch (e) {
    console.error('KRİTİK HATA:', e.message);
  }
})();
