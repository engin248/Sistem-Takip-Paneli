/**
 * STP — Eksik Tabloları Oluştur (Service Role Key ile)
 * Supabase REST API + service_role key DDL yapamaz.
 * Bu script PostgreSQL pg driver ile doğrudan bağlanır.
 * 
 * Çalıştırma: node scripts/migrate-direct.mjs
 */

import pg from 'pg';
const { Client } = pg;

// Supabase direct connection (service role)
const client = new Client({
  host: 'db.tesxmqhkegotxenoljzl.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: process.env.SUPABASE_DB_PASSWORD || 'SET_VIA_ENV',
  ssl: { rejectUnauthorized: false },
});

const SQLS = [
  // 1. board_decisions
  `CREATE TABLE IF NOT EXISTS board_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    decision_code TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'CONFIG_CHANGE',
    status TEXT NOT NULL DEFAULT 'pending',
    requested_by TEXT NOT NULL DEFAULT 'SISTEM',
    agent_strategic_vote TEXT,
    agent_strategic_reason TEXT,
    agent_strategic_confidence NUMERIC,
    agent_strategic_at TIMESTAMPTZ,
    agent_technical_vote TEXT,
    agent_technical_reason TEXT,
    agent_technical_confidence NUMERIC,
    agent_technical_at TIMESTAMPTZ,
    agent_security_vote TEXT,
    agent_security_reason TEXT,
    agent_security_confidence NUMERIC,
    agent_security_at TIMESTAMPTZ,
    consensus_result JSONB,
    seal_hash TEXT,
    sealed_at TIMESTAMPTZ,
    vote_source TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  )`,
  `ALTER TABLE board_decisions ENABLE ROW LEVEL SECURITY`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'bd_sel') THEN CREATE POLICY bd_sel ON board_decisions FOR SELECT USING (true); END IF; END $$`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'bd_ins') THEN CREATE POLICY bd_ins ON board_decisions FOR INSERT WITH CHECK (true); END IF; END $$`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'bd_upd') THEN CREATE POLICY bd_upd ON board_decisions FOR UPDATE USING (true); END IF; END $$`,

  // 2. notifications
  `CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info',
    is_read BOOLEAN DEFAULT false,
    task_id UUID,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
  )`,
  `ALTER TABLE notifications ENABLE ROW LEVEL SECURITY`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'notif_sel') THEN CREATE POLICY notif_sel ON notifications FOR SELECT USING (true); END IF; END $$`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'notif_ins') THEN CREATE POLICY notif_ins ON notifications FOR INSERT WITH CHECK (true); END IF; END $$`,

  // 3. self_learning_logs
  `CREATE TABLE IF NOT EXISTS self_learning_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern_type TEXT NOT NULL,
    pattern_data JSONB DEFAULT '{}',
    severity TEXT DEFAULT 'INFO',
    recommendations TEXT[],
    created_at TIMESTAMPTZ DEFAULT now()
  )`,
  `ALTER TABLE self_learning_logs ENABLE ROW LEVEL SECURITY`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'sll_sel') THEN CREATE POLICY sll_sel ON self_learning_logs FOR SELECT USING (true); END IF; END $$`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'sll_ins') THEN CREATE POLICY sll_ins ON self_learning_logs FOR INSERT WITH CHECK (true); END IF; END $$`,

  // 4. Priority düzeltme
  `UPDATE tasks SET priority = 'yuksek' WHERE priority = 'high'`,
];

async function run() {
  console.log('═══ STP VERİTABANI MİGRASYON ═══\n');
  
  try {
    await client.connect();
    console.log('✅ PostgreSQL bağlantısı başarılı\n');
  } catch (e) {
    console.error('❌ Bağlantı hatası:', e.message);
    process.exit(1);
  }

  for (const sql of SQLS) {
    const label = sql.substring(0, 60).replace(/\n/g, ' ');
    try {
      const result = await client.query(sql);
      console.log(`✅ ${label}... → ${result.command || 'OK'} ${result.rowCount !== null ? `(${result.rowCount} satır)` : ''}`);
    } catch (e) {
      console.log(`⚠️ ${label}... → ${e.message}`);
    }
  }

  // Doğrulama
  console.log('\n─── DOĞRULAMA ───');
  const tables = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`);
  console.log('Mevcut tablolar:');
  tables.rows.forEach(r => console.log(`  ✅ ${r.table_name}`));

  await client.end();
  console.log('\n═══ MİGRASYON TAMAMLANDI ═══');
}

run().catch(e => { console.error('KRİTİK:', e.message); process.exit(1); });
