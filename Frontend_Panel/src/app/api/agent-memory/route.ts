// src/app/api/agent-memory/route.ts
// GET /api/agent-memory?agent_id=K-1&q=analiz → Hafıza sorgusu
// GET /api/agent-memory?agent_id=K-1&stats=1  → İstatistik
// DELETE /api/agent-memory?agent_id=K-1       → Hafıza temizle
// ============================================================

import { NextResponse, type NextRequest } from 'next/server';
import { readMemories, queryMemory, getMemoryStats } from '@/core/agentMemory';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const agent_id = searchParams.get('agent_id');
  const sorgu    = searchParams.get('q');
  const stats    = searchParams.get('stats');

  if (!agent_id) {
    return NextResponse.json({ success: false, message: 'agent_id zorunlu' }, { status: 400 });
  }

  if (stats === '1') {
    const istatistik = getMemoryStats(agent_id);
    return NextResponse.json({ success: true, agent_id, ...istatistik });
  }

  if (sorgu) {
    const sonuc = queryMemory(agent_id, sorgu, 5);
    return NextResponse.json({ success: true, agent_id, ...sonuc });
  }

  // Tüm hafıza
  const memories = readMemories(agent_id);
  return NextResponse.json({
    success  : true,
    agent_id ,
    toplam   : memories.length,
    memories : memories.slice(-30).reverse(), // Son 30, en yeni başta
  });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const agent_id = searchParams.get('agent_id');
  if (!agent_id) {
    return NextResponse.json({ success: false, message: 'agent_id zorunlu' }, { status: 400 });
  }

  const MEMORY_DIR = process.env.AGENT_MEMORY_DIR
    ?? path.join(process.cwd(), '.agent_memory');
  const fp = path.join(MEMORY_DIR, `agent_${agent_id.replace(/[^a-zA-Z0-9-]/g, '_')}.jsonl`);

  try {
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
    return NextResponse.json({ success: true, message: `${agent_id} hafızası silindi` });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
