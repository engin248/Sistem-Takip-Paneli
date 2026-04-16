// src/app/api/decompose/route.ts
// POST /api/decompose { gorev } → Görev planı üret + multi-agent icra
// ============================================================

import { NextResponse, type NextRequest } from 'next/server';
import { goreviPlanla } from '@/core/taskDecomposer';
import { runAgentWorker } from '@/core/agentWorker';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  let body: { gorev?: string; icra?: boolean };
  try {
    body = await request.json() as typeof body;
  } catch {
    return NextResponse.json({ success: false, message: 'Geçersiz JSON' }, { status: 400 });
  }

  const { gorev, icra = false } = body;

  if (!gorev || gorev.trim().length < 5) {
    return NextResponse.json({ success: false, message: 'Görev metni en az 5 karakter' }, { status: 400 });
  }

  // Planla
  const plan = goreviPlanla(gorev.trim());

  // Sadece plan istendi mi?
  if (!icra) {
    return NextResponse.json({ success: true, plan });
  }

  // İcra et — alt-görevleri sırayla çalıştır
  const sonuclar: Array<{
    sira: number; ajan_id: string; ajan_kodu: string;
    durum: string; sonuc: string; sure_ms: number;
  }> = [];

  for (const ag of plan.alt_gorevler) {
    const baslangic = Date.now();
    try {
      const w = await runAgentWorker({
        agent_id: ag.ajan_id,
        task    : ag.gorev,
        use_rag : true,
        use_web : false,
      });
      const sure_ms = Date.now() - baslangic;
      sonuclar.push({
        sira: ag.sira, ajan_id: ag.ajan_id, ajan_kodu: ag.ajan_kodu,
        durum: w.status, sonuc: w.result.slice(0, 600), sure_ms,
      });
      ag.durum = w.status === 'tamamlandi' ? 'tamamlandi' : 'hata';
      ag.sonuc = w.result.slice(0, 200);
    } catch (err) {
      const sure_ms = Date.now() - baslangic;
      sonuclar.push({
        sira: ag.sira, ajan_id: ag.ajan_id, ajan_kodu: ag.ajan_kodu,
        durum: 'hata',
        sonuc: err instanceof Error ? err.message : String(err),
        sure_ms,
      });
      ag.durum = 'hata';
    }
  }

  const hepsiTamamlandi = sonuclar.every(s => s.durum === 'tamamlandi');

  return NextResponse.json({
    success  : hepsiTamamlandi,
    plan     : { ...plan, alt_gorevler: plan.alt_gorevler },
    sonuclar ,
    ozet     : sonuclar.map(s => `[${s.sira}/${plan.alt_gorevler.length}] ${s.ajan_kodu}: ${s.durum.toUpperCase()}`).join(' | '),
  });
}
