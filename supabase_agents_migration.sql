-- ============================================================
-- AGENTS TABLOSU MIGRATION
-- Sistem Takip Paneli — STP-03 Ajan Yönetim Merkezi
-- Çalıştır: Supabase Dashboard → SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.agents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_code TEXT NOT NULL UNIQUE,
  codename TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'YAZILIM',
  status TEXT NOT NULL DEFAULT 'BOSTA',
  specialty TEXT NOT NULL DEFAULT '',
  tasks_completed INTEGER DEFAULT 0,
  health INTEGER DEFAULT 100,
  last_action TEXT DEFAULT 'Yeni eklendi',
  role TEXT DEFAULT '',
  rules TEXT DEFAULT '',
  directives TEXT DEFAULT '',
  memory TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS aktif et (güvenlik zorunlu)
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

-- Okuma politikası: oturum açmış herkes okuyabilir
CREATE POLICY "agents_select_policy" ON public.agents
  FOR SELECT USING (true);

-- Yazma politikası: oturum açmış kullanıcılar yazabilir
CREATE POLICY "agents_insert_policy" ON public.agents
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "agents_update_policy" ON public.agents
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Seed verisi: 4 temel ajan
INSERT INTO public.agents (agent_code, codename, tier, status, specialty, tasks_completed, health, last_action) VALUES
  ('AG-01', 'MİMAR-X', 'YAZILIM', 'AKTİF', 'Ollama (Llama-3)', 1450, 100, 'Sistem hazır, emir bekliyor.'),
  ('AG-02', 'RADAR-OSINT', 'WEB', 'AKTİF', 'Ollama (Llama-3)', 890, 98, 'Sistem hazır, emir bekliyor.'),
  ('AG-03', 'PİSAGOR', 'AR-GE', 'BOSTA', 'Ollama (Llama-3)', 3421, 92, 'Beklemede'),
  ('AG-04', 'KOD-MÜFETTİŞİ', 'DENETİM', 'BOSTA', 'Ollama (Llama-3)', 560, 100, 'Beklemede')
ON CONFLICT (agent_code) DO NOTHING;
