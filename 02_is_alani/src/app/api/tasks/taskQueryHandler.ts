// ============================================================
// TASK QUERY HANDLER — GET Endpoint İşleyicisi
// ============================================================
// GET /api/tasks?action=list|agents|suggest|auto-assign
// tasks/route.ts tarafından kullanılır.
// ============================================================

import { type NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { ERR, processError } from '@/lib/errorCore';
import { analyzeLocalPriority } from '@/services/aiManager';
import { agentRegistry } from '@/services/agentRegistry';
import { analyzeKapasite } from '@/services/agentCloner';

export async function handleTaskQuery(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url);
  const action = url.searchParams.get('action');

  try {
    switch (action) {
      // ?action=list
      case 'list': {
        const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10) || 50, 100);
        const priorityParam = url.searchParams.get('priority');
        const statusParam = url.searchParams.get('status');

        let query = supabase
          .from('tasks')
          .select('id, task_code, title, description, status, priority, assigned_to, assigned_by, due_date, created_at, updated_at')
          .eq('is_archived', false)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (priorityParam) query = query.eq('priority', priorityParam);
        if (statusParam) query = query.eq('status', statusParam);

        const { data, error } = await query;
        if (error) {
          processError(ERR.TASK_FETCH, error, { kaynak: 'taskQueryHandler.ts', islem: 'LIST' });
          return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }
        return NextResponse.json({ success: true, data: data ?? [], count: data?.length ?? 0, timestamp: new Date().toISOString() });
      }

      // ?action=agents
      case 'agents': {
        const agentList = agentRegistry.getAll().map(a => ({
          kod_adi: a.kod_adi, rol: a.rol, katman: a.katman, durum: a.durum, beceri_listesi: a.beceri_listesi,
        }));
        return NextResponse.json({ success: true, data: agentList, count: agentList.length, timestamp: new Date().toISOString() });
      }

      // ?action=suggest&title=xxx
      case 'suggest': {
        const title = url.searchParams.get('title');
        if (!title || title.length < 3) {
          return NextResponse.json({ success: false, error: 'title parametresi en az 3 karakter olmalı' }, { status: 400 });
        }
        const result = analyzeLocalPriority(title);
        return NextResponse.json({ success: true, data: { priority: result.priority, confidence: result.confidence, reasoning: result.reasoning, detectedKeywords: result.detectedKeywords, source: result.source }, timestamp: new Date().toISOString() });
      }

      // ?action=auto-assign&title=xxx
      case 'auto-assign': {
        const taskTitle = url.searchParams.get('title');
        if (!taskTitle || taskTitle.length < 3) {
          return NextResponse.json({ success: false, error: 'title parametresi en az 3 karakter olmalı' }, { status: 400 });
        }
        const keywords = taskTitle.toLowerCase().split(/[\s,._-]+/).filter(k => k.length > 2);
        const analiz = analyzeKapasite(keywords.join('_'));

        if (analiz.kapasiteVar && analiz.uygunAjanlar.length > 0) {
          return NextResponse.json({ success: true, data: { recommended_agent: analiz.uygunAjanlar[0]!.kod_adi, all_capable: analiz.uygunAjanlar.map(a => ({ kod_adi: a.kod_adi, rol: a.rol })), method: 'DIRECT_MATCH' }, timestamp: new Date().toISOString() });
        }
        return NextResponse.json({ success: true, data: { recommended_agent: analiz.klonKaynagi?.kod_adi ?? 'SISTEM', all_capable: [], method: analiz.onerilenYol ?? 'FALLBACK', gap_analysis: { klon_kaynagi: analiz.klonKaynagi?.kod_adi ?? null } }, timestamp: new Date().toISOString() });
      }

      default:
        return NextResponse.json({ success: false, error: 'Geçerli action: list | agents | suggest | auto-assign' }, { status: 400 });
    }
  } catch (error) {
    processError(ERR.SYSTEM_GENERAL, error, { kaynak: 'taskQueryHandler.ts', islem: 'GET', action });
    return NextResponse.json({ success: false, error: 'İstek işlenirken hata oluştu', timestamp: new Date().toISOString() }, { status: 500 });
  }
}
