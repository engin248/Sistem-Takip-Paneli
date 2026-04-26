// ============================================================
// /api/health-check — Sistem Sağlık Kontrol Endpoint'i
// ============================================================
// KÖK NEDEN: Bu endpoint hiç oluşturulmamıştı.
// Etki Alanı: HealthDashboard, monitoring, ses asistanı
// Çözüm: Supabase + Ollama + Planlama Motoru sağlık kontrolü
// ============================================================

import { NextResponse } from 'next/server';

interface HealthResult {
    servis: string;
    durum: 'aktif' | 'pasif' | 'hata';
    sure_ms: number;
    detay?: string;
}

async function kontrolEt(ad: string, url: string, timeoutMs = 5000): Promise<HealthResult> {
    const baslangic = Date.now();
    try {
        const res = await fetch(url, {
            method: 'GET',
            signal: AbortSignal.timeout(timeoutMs),
        });
        const sure = Date.now() - baslangic;

        if (res.ok) {
            return { servis: ad, durum: 'aktif', sure_ms: sure };
        }
        return { servis: ad, durum: 'hata', sure_ms: sure, detay: `HTTP ${res.status}` };
    } catch (e: unknown) {
        const sure = Date.now() - baslangic;
        const msg = e instanceof Error ? e.message : String(e);
        return { servis: ad, durum: 'pasif', sure_ms: sure, detay: msg };
    }
}

export async function GET() {
    const baslangic = Date.now();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    const planlamaUrl = 'http://localhost:3099';

    // Paralel kontrol — tüm servisleri aynı anda sorgula
    const [supabase, ollama, planlama] = await Promise.all([
        supabaseUrl.length > 10
            ? kontrolEt('Supabase', `${supabaseUrl}/rest/v1/`, 5000)
            : Promise.resolve({ servis: 'Supabase', durum: 'pasif' as const, sure_ms: 0, detay: 'URL tanımsız' }),
        kontrolEt('Ollama', `${ollamaUrl}/api/tags`, 5000),
        kontrolEt('Planlama Motoru', `${planlamaUrl}/health`, 5000),
    ]);

    const sonuclar: HealthResult[] = [supabase, ollama, planlama];

    // Frontend kendisi
    sonuclar.push({
        servis: 'Frontend Panel',
        durum: 'aktif',
        sure_ms: 0,
        detay: `Next.js — Build aktif`,
    });

    const aktifSayisi = sonuclar.filter(s => s.durum === 'aktif').length;
    const toplamSure = Date.now() - baslangic;

    return NextResponse.json({
        success: true,
        zaman: new Date().toISOString(),
        toplam_sure_ms: toplamSure,
        ozet: {
            aktif: aktifSayisi,
            pasif: sonuclar.filter(s => s.durum === 'pasif').length,
            hata: sonuclar.filter(s => s.durum === 'hata').length,
            toplam: sonuclar.length,
        },
        servisler: sonuclar,
    });
}
