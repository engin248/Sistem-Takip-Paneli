// Supabase canlı due_date kolon doğrulaması
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

// .env.local oku
const envContent = readFileSync('.env.local', 'utf-8');
const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL="?([^"\s\n]+)/);
const keyMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY="?([^"\s\n]+)/);

if (!urlMatch || !keyMatch) {
  console.error('❌ ENV okunamadı');
  process.exit(1);
}

const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

console.log('═══ SUPABASE CANLI DOĞRULAMA ═══\n');
console.log(`URL: ${urlMatch[1].trim()}`);

// 1. Tasks tablosunu sorgula — due_date kolonu var mı?
const { data: tasks, error: taskErr } = await supabase
  .from('tasks')
  .select('id, title, status, priority, due_date')
  .limit(5);

if (taskErr) {
  console.log(`\n❌ TASKS SORGUSU HATA: ${taskErr.message}`);
  console.log(`   Detay: ${taskErr.details || 'yok'}`);
  console.log(`   Hint: ${taskErr.hint || 'yok'}`);
  
  // due_date kolonu yoksa spesifik hata verir
  if (taskErr.message.includes('due_date') || taskErr.message.includes('column')) {
    console.log('\n🔴 SONUÇ: due_date kolonu MEVCUT DEĞİL — Migration 002 ÇALIŞTIRILMAMIŞ!');
  }
} else {
  console.log(`\n✅ TASKS sorgusu başarılı — ${tasks.length} kayıt döndü`);
  
  // due_date alanı sonuçta mevcut mu kontrol et
  if (tasks.length > 0) {
    const hasDueDate = 'due_date' in tasks[0];
    console.log(`\n📋 Kayıtlar:`);
    for (const t of tasks) {
      console.log(`   ${t.id?.substring(0,8)}... | ${t.title?.substring(0,40)} | ${t.status} | ${t.priority} | due_date: ${t.due_date ?? 'NULL'}`);
    }
    console.log(`\n🔍 due_date alanı yanıtta mevcut: ${hasDueDate ? '✅ EVET' : '❌ HAYIR'}`);
    
    if (hasDueDate) {
      console.log('\n🟢 SONUÇ: due_date kolonu MEVCUT — Migration 002 ÇALIŞTIRILMIŞ');
    } else {
      console.log('\n🔴 SONUÇ: due_date kolonu yanıtta YOK — Migration 002 ÇALIŞTIRILMAMIŞ OLABİLİR');
    }
  } else {
    console.log('\n⚠️ Tabloda kayıt yok — due_date kolon varlığı doğrudan sorgulanıyor...');
    
    // Boş tablo — insert dene ve sil
    const { error: insertErr } = await supabase
      .from('tasks')
      .insert([{
        title: '__DUE_DATE_KOLON_TESTI__',
        status: 'beklemede',
        priority: 'dusuk',
        due_date: '2026-12-31T23:59:59Z',
      }])
      .select();
    
    if (insertErr) {
      if (insertErr.message.includes('due_date')) {
        console.log(`\n🔴 SONUÇ: due_date kolonu YOK — INSERT hatası: ${insertErr.message}`);
      } else {
        console.log(`\n⚠️ INSERT hatası (due_date dışı): ${insertErr.message}`);
      }
    } else {
      console.log('\n✅ due_date ile INSERT başarılı — kolon MEVCUT');
      // Test kaydını sil
      await supabase.from('tasks').delete().eq('title', '__DUE_DATE_KOLON_TESTI__');
      console.log('🧹 Test kaydı silindi');
      console.log('\n🟢 SONUÇ: due_date kolonu MEVCUT — Migration 002 ÇALIŞTIRILMIŞ');
    }
  }
}

// 2. Toplam kayıt sayısı
const { count } = await supabase.from('tasks').select('*', { count: 'exact', head: true });
console.log(`\n📊 tasks tablosu toplam kayıt: ${count ?? 'bilinmiyor'}`);

console.log('\n═══════════════════════════════════════');
