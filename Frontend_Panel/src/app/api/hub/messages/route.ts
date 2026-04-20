// ============================================================
// HUB MESSAGES API — /api/hub/messages
// ============================================================
// R1 DÜZELTMESİ: In-memory → DB okuma geçişi.
// getRecentMessagesAsync() ile DB'den okuma yapılır.
// ============================================================

import { NextResponse, type NextRequest } from 'next/server';
import { getRecentMessagesAsync } from '@/lib/eventBus';
import { logAudit } from '@/services/auditService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const rawLimit = request.nextUrl.searchParams.get('limit');
    let limit = 50;
    
    if (rawLimit) {
      const parsed = Number.parseInt(rawLimit, 10);
      if (!Number.isNaN(parsed) && parsed > 0) {
        limit = Math.min(parsed, 200);
      }
    }

    // DB'den oku — tablo yoksa in-memory fallback
    const messages = await getRecentMessagesAsync(limit);

    // Audit log işlemini izole et ve yanıtı bozmasını engelle
    try {
      await logAudit({
        operation_type: 'READ',
        action_description: `Hub messages fetched: ${messages.length}`,
        metadata: { action_code: 'HUB_FETCH', count: messages.length },
      });
    } catch (e) {
      console.warn('[AUDIT_SKIP] Hub log failed:', e);
    }

    return NextResponse.json({ 
      success: true, 
      messages: messages ?? [], 
      count: messages?.length ?? 0 
    });
  } catch (err) {
    console.error('[API_500] /api/hub/messages:', err);
    return NextResponse.json(
      { 
        success: false, 
        error: err instanceof Error ? err.message : String(err),
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
