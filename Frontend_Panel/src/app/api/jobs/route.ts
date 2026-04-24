import { NextResponse } from 'next/server';

export async function GET() {
  const mockJobs = [
    {
      job_id: 'JOB-99824',
      agent_id: 'AG-01',
      agent_kod_adi: 'ANA SİSTEM',
      agent_katman: 'KOMUTA',
      task: 'GÖREV MONİTÖRÜ SİSTEM KONTROLÜ',
      priority: 5,
      status: 'isleniyor',
      created_at: new Date().toISOString(),
      duration_ms: 540
    },
    {
      job_id: 'JOB-99825',
      agent_id: 'AG-03',
      agent_kod_adi: 'ARKA_PLAN-İŞÇİ',
      agent_katman: 'L2',
      task: 'SİSTEM SAĞLIK TARAMASI',
      priority: 3,
      status: 'tamamlandi',
      created_at: new Date(Date.now() - 60000).toISOString(),
      completed_at: new Date(Date.now() - 50000).toISOString(),
      result: 'TARAMA BAŞARILI. SİSTEM STABİL.',
      duration_ms: 10000
    }
  ];
  
  const stats = {
    toplam: 2,
    tamamlandi: 1,
    hata: 0,
    reddedildi: 0,
    basari_orani: 100,
    ort_sure_ms: 5000
  };

  return NextResponse.json({ success: true, jobs: mockJobs, stats });
}
