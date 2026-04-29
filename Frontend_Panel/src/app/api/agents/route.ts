// ============================================================
// /api/agents — Ajan CRUD API
// GET: Supabase'den tüm ajanları çek
// POST: Yeni ajan ekle
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const MOCK_AGENTS = [
  { id: 'AG-01', agent_code: 'AG-01', codename: 'MİMAR-X', tier: 'YAZILIM', status: 'AKTİF', specialty: 'Ollama (Llama-3)', tasks_completed: 1450, health: 100, last_action: 'Sistem hazır, emir bekliyor.' },
  { id: 'AG-02', agent_code: 'AG-02', codename: 'RADAR-OSINT', tier: 'WEB', status: 'AKTİF', specialty: 'Ollama (Llama-3)', tasks_completed: 890, health: 98, last_action: 'Sistem hazır, emir bekliyor.' },
  { id: 'AG-03', agent_code: 'AG-03', codename: 'PİSAGOR', tier: 'AR-GE', status: 'BOSTA', specialty: 'Ollama (Llama-3)', tasks_completed: 3421, health: 92, last_action: 'Beklemede' },
  { id: 'AG-04', agent_code: 'AG-04', codename: 'KOD-MÜFETTİŞİ', tier: 'DENETİM', status: 'BOSTA', specialty: 'Ollama (Llama-3)', tasks_completed: 560, health: 100, last_action: 'Beklemede' },
];

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      // Tablo yoksa mock veri dön
      if (error.code === '42P01' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
        return NextResponse.json({ agents: MOCK_AGENTS, source: 'mock', warning: 'agents tablosu yok — supabase_agents_migration.sql çalıştır' });
      }
      throw error;
    }

    return NextResponse.json({ agents: data || [], source: 'supabase' });
  } catch (err: any) {
    console.error('[API/agents GET]', err);
    return NextResponse.json({ agents: MOCK_AGENTS, source: 'mock', error: err.message });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { codename, tier, specialty, role, rules, directives, memory } = body;

    if (!codename) {
      return NextResponse.json({ error: 'Ajan adı zorunlu' }, { status: 400 });
    }

    // Ajan kodu otomatik üret
    const { count } = await supabase.from('agents').select('*', { count: 'exact', head: true });
    const newCode = `AG-${String((count || 0) + 1).padStart(2, '0')}`;

    const { data, error } = await supabase
      .from('agents')
      .insert({
        agent_code: newCode,
        codename: codename.toUpperCase(),
        tier: tier || 'YAZILIM',
        status: 'BOSTA',
        specialty: specialty || 'Ollama (Llama-3)',
        tasks_completed: 0,
        health: 100,
        last_action: 'Kadroya yeni eklendi.',
        role: role || '',
        rules: rules || '',
        directives: directives || '',
        memory: memory || '',
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ agent: data, message: `${codename} kadroya eklendi` });
  } catch (err: any) {
    console.error('[API/agents POST]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
