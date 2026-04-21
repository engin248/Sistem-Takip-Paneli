// src/app/api/tools/route.ts
// POST /api/tools
// ============================================================
// Araç çalıştırma endpoint'i
// Body: { arac: string, params: object, agent_id?: string }
// ============================================================

import { NextResponse, type NextRequest } from 'next/server';
import { toolCalistir, ARAC_SEMA, type ToolAdi } from '@/core/toolRunner';
import { logAudit } from '@/services/auditService';
import { aracKontrol } from '@/core/ruleGuard';

export const dynamic = 'force-dynamic';

const GECERLI_ARACLAR: ToolAdi[] = [
  'dosyaOku', 'dosyaYaz', 'dizinListele',
  'webAra', 'ragSorgula', 'apiCagir',
];

// GET → Araç şemasını döner
export async function GET() {
  return NextResponse.json({ success: true, araclar: ARAC_SEMA });
}

// POST → Araç çalıştır
export async function POST(request: NextRequest) {
  let body: { arac?: string; params?: Record<string, unknown>; agent_id?: string };

  try {
    body = await request.json() as typeof body;
  } catch {
    return NextResponse.json({ success: false, message: 'Geçersiz JSON' }, { status: 400 });
  }

  if (!body.arac) {
    return NextResponse.json({ success: false, message: '"arac" alanı gerekli' }, { status: 400 });
  }

  if (!GECERLI_ARACLAR.includes(body.arac as ToolAdi)) {
    return NextResponse.json({
      success : false,
      message : `Geçersiz araç: "${body.arac}"`,
      gecerli : GECERLI_ARACLAR,
    }, { status: 400 });
  }

  // ── SİSTEM KURALLARI: Araç Kontrol ───────────────────────────
  const agentId = body.agent_id || 'API_TOOLS';
  const katman = 'L1'; // API üzerinden gelen araç çağrıları L1 seviyesinde
  const kontrol = aracKontrol(agentId, katman, body.arac as string, body.params || {});
  if (!kontrol.gecti) {
    return NextResponse.json({
      success: false,
      message: `Sistem Kuralları İhlali: ${kontrol.aciklama}`,
      kural_no: kontrol.kural_no,
    }, { status: 403 });
  }

  const sonuc = await toolCalistir({
    arac  : body.arac as ToolAdi,
    params: body.params || {},
  });

  // Audit log
  await logAudit({
    operation_type     : 'EXECUTE',
    action_description : `TOOL: ${body.arac} — ${sonuc.basari ? 'BAşARILI' : 'HATA'} — ${sonuc.sure_ms}ms`,
    metadata: {
      action_code: 'TOOL_EXECUTED',
      arac       : body.arac,
      agent_id   : body.agent_id,
      basari     : sonuc.basari,
      sure_ms    : sonuc.sure_ms,
      hata       : sonuc.hata,
    },
  }).catch(() => {});

  return NextResponse.json({
    success: sonuc.basari,
    ...sonuc,
  }, { status: sonuc.basari ? 200 : 500 });
}
