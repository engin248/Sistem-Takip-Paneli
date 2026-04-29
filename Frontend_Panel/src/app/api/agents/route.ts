// ============================================================
// /api/agents — Yerel-Önce Ajan CRUD
// MİMARİ:
//   Tüm işlemler → data/agents.json (anlık, limitsiz)
//   Supabase     → sadece /api/agents/sync çağrısında
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { localRead, localInsert, getSyncStatus } from '@/lib/localStore';

// Supabase agents mevcut değilse yerel seed verisi (ilk çalıştırma)
const SEED_AGENTS = [
  { id: 'AG-01', agent_code: 'AG-01', codename: 'MİMAR-X', tier: 'YAZILIM', status: 'AKTIF', specialty: 'Ollama (qwen3:8b)', tasks_completed: 1450, health: 100, last_action: 'Sistem hazır, emir bekliyor.' },
  { id: 'AG-02', agent_code: 'AG-02', codename: 'RADAR-OSINT', tier: 'WEB', status: 'AKTIF', specialty: 'Ollama (qwen3:8b)', tasks_completed: 890, health: 98, last_action: 'Sistem hazır, emir bekliyor.' },
  { id: 'AG-03', agent_code: 'AG-03', codename: 'PİSAGOR', tier: 'AR-GE', status: 'BOSTA', specialty: 'Ollama (qwen3:8b)', tasks_completed: 3421, health: 92, last_action: 'Beklemede' },
  { id: 'AG-04', agent_code: 'AG-04', codename: 'KOD-MÜFETTİŞİ', tier: 'DENETİM', status: 'BOSTA', specialty: 'Ollama (qwen3:8b)', tasks_completed: 560, health: 100, last_action: 'Beklemede' },
];

function ensureSeedData() {
  const existing = localRead('agents');
  if (existing.length === 0) {
    // İlk çalıştırma — seed verisi yaz (tümü zaten synced sayılır)
    for (const agent of SEED_AGENTS) {
      localInsert('agents', { ...agent, _synced: true });
    }
    return localRead('agents');
  }
  return existing;
}

export async function GET() {
  try {
    const agents = ensureSeedData();
    const syncStatus = getSyncStatus();

    return NextResponse.json({
      agents,
      source: 'local',
      sync_pending: syncStatus.pending.agents || 0,
      last_sync: syncStatus.lastSync,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[API/agents GET]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { codename, tier, specialty, role, rules, directives, memory } = body;

    if (!codename) {
      return NextResponse.json({ error: 'Ajan adı zorunlu' }, { status: 400 });
    }

    const existing = localRead('agents');
    const newCode = `AG-${String(existing.length + 1).padStart(2, '0')}`;

    const newAgent = localInsert('agents', {
      id: newCode,
      agent_code: newCode,
      codename: codename.toUpperCase(),
      tier: tier || 'YAZILIM',
      status: 'BOSTA',
      specialty: specialty || 'Ollama (qwen3:8b)',
      tasks_completed: 0,
      health: 100,
      last_action: 'Kadroya yeni eklendi.',
      role: role || '',
      rules: rules || '',
      directives: directives || '',
      memory: memory || '',
      _synced: false,
    });

    return NextResponse.json({
      agent: newAgent,
      message: `${codename} yerel arşive eklendi`,
      note: 'Supabase\'e göndermek için "Arşivle" butonuna bas',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
