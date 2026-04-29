// ============================================================
// jobs/route.ts — Gerçek Supabase Verisi
// HATA #10: Önceden hardcoded mock döndürüyordu.
//           Planlama motoru tarafından işlenen görevleri
//           Supabase tasks tablosundan okur.
// ============================================================

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function GET() {
  // Supabase bağlantısı yoksa açıkça belirt — veri uydurmak yasak (F-004)
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({
      success: false,
      error: 'VERİ HATTI KESİK — NEXT_PUBLIC_SUPABASE_URL veya ANON_KEY tanımlı değil.',
      jobs: [],
      stats: { toplam: 0, tamamlandi: 0, hata: 0, reddedildi: 0, basari_orani: 0, ort_sure_ms: 0 }
    }, { status: 503 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // tasks tablosundan son 50 görevi çek (planlama motoru tarafından işlenenler)
    const { data: gorevler, error } = await supabase
      .from('tasks')
      .select('id, task_code, title, status, priority, created_at, updated_at, metadata')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({
        success: false,
        error: `Supabase Hatası: ${error.message}`,
        jobs: [],
        stats: { toplam: 0, tamamlandi: 0, hata: 0, reddedildi: 0, basari_orani: 0, ort_sure_ms: 0 }
      }, { status: 500 });
    }

    const jobs = (gorevler || []).map((g) => ({
      job_id:          g.task_code || g.id,
      agent_id:        g.metadata?.ajan_id || 'SİSTEM',
      agent_kod_adi:   g.metadata?.ajan_adi || 'OTONOM',
      agent_katman:    g.metadata?.katman   || 'L1',
      task:            g.title,
      priority:        g.priority === 'kritik' ? 5 : g.priority === 'yuksek' ? 4 : g.priority === 'dusuk' ? 2 : 3,
      status:          g.status,
      created_at:      g.created_at,
      updated_at:      g.updated_at,
      result:          g.metadata?.sonuc || null,
      duration_ms:     g.metadata?.sure_ms || null,
    }));

    const tamamlandi  = jobs.filter(j => j.status === 'tamamlandi').length;
    const hata        = jobs.filter(j => j.status === 'hata').length;
    const reddedildi  = jobs.filter(j => j.status === 'reddedildi').length;
    const basari      = jobs.length > 0 ? Math.round((tamamlandi / jobs.length) * 100) : 0;

    return NextResponse.json({
      success: true,
      jobs,
      stats: {
        toplam:       jobs.length,
        tamamlandi,
        hata,
        reddedildi,
        basari_orani: basari,
        ort_sure_ms:  jobs.filter(j => j.duration_ms).reduce((a, j) => a + (j.duration_ms || 0), 0) / (jobs.filter(j => j.duration_ms).length || 1),
      }
    });

  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: `İç Hata: ${err.message}`,
      jobs: [],
      stats: { toplam: 0, tamamlandi: 0, hata: 0, reddedildi: 0, basari_orani: 0, ort_sure_ms: 0 }
    }, { status: 500 });
  }
}
