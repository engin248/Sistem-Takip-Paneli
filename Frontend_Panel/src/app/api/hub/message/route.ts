// ============================================================
// HUB MESSAGE API — /api/hub/message
// ============================================================
// R1 DÜZELTMESİ: DB persist artık eventBus.publishMessage()
// içinde yapılıyor. Route sadece publish + audit yapıyor.
// ============================================================

import { NextResponse, type NextRequest } from 'next/server';
import { publishMessage } from '@/lib/eventBus';
import { logAudit } from '@/services/auditService';
import { gorevOnKontrol } from '@/core/ruleGuard';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body?.text) return NextResponse.json({ success: false, message: 'text required' }, { status: 400 });

    // ── SİSTEM KURALLARI: Giriş Kontrolü ───────────────────
    const kontrol = gorevOnKontrol('HUB_MSG', 'L1', String(body.text));
    if (!kontrol.gecti) {
      return NextResponse.json({ success: false, message: `Sistem Kuralları: ${kontrol.aciklama}`, kural_no: kontrol.kural_no }, { status: 403 });
    }
    
    // publishMessage() artık kendi içinde DB persist yapıyor
    const msg = publishMessage({ source: body.source, target: body.target, text: String(body.text) });

    // Audit log işlemini izole et
    try {
      await logAudit({ 
        operation_type: 'EXECUTE', 
        action_description: `Hub message published: ${msg.id}`, 
        metadata: { action_code: 'HUB_PUBLISH', message_id: msg.id, source: msg.source, target: msg.target } 
      });
    } catch (e) {
      console.warn('[AUDIT_SKIP] Hub publish log failed:', e);
    }

    return NextResponse.json({ success: true, msg });
  } catch (err) {
    console.error('[API_500] /api/hub/message:', err);
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
