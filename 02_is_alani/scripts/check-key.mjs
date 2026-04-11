import { createClient } from '@supabase/supabase-js';

const url = 'https://tesxmqhkegotxenoljzl.supabase.co';

// Service role key deneme — tarayıcıdan okunan
const keys = [
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'PLACEHOLDER_KEY',
];

for (const key of keys) {
  console.log(`\nKey deneniyor: ${key.substring(0, 20)}...`);
  const sb = createClient(url, key, { auth: { persistSession: false } });
  
  try {
    // 1. Tablo listesi — pg_tables sorgusu
    const { data, error } = await sb.rpc('exec_sql', { query: "SELECT 1" });
    if (error) {
      console.log(`RPC yok: ${error.message}`);
    } else {
      console.log('RPC çalıştı:', data);
    }
  } catch (e) {
    console.log(`Hata: ${e.message}`);
  }
  
  // 2. board_decisions INSERT ile tablo oluşturma test
  try {
    const { data, error } = await sb.from('board_decisions').select('id').limit(1);
    if (error) {
      console.log(`board_decisions: ${error.code} — ${error.message}`);
      if (error.message.includes('does not exist') || error.code === '42P01') {
        console.log('→ Tablo YOK — oluşturulması gerekiyor');
      }
    } else {
      console.log(`board_decisions: MEVCUT (${data?.length} kayıt)`);
    }
  } catch (e) {
    console.log(`board_decisions kontrol hatası: ${e.message}`);
  }
}

console.log('\n--- SONUÇ ---');
console.log('board_decisions tablosunu oluşturmak için');
console.log('Supabase Dashboard → SQL Editor → supabase_migration_001.sql çalıştırılmalı');
