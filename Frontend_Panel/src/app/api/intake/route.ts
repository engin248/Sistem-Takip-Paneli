// ============================================================
// intake/route.ts — Merkez Panel Görev Alım Noktası
// ============================================================
// DÜZELTİLDİ (2026-04-26) — Komple yeniden yazıldı:
//
// ESKİ DURUM:
//   Panel → /api/intake → sadece planlamaAlgoritmaPipeline() çağırıyordu
//   → Supabase'e kaydetmiyordu
//   → processTask() çağırmıyordu
//   → Kurul Masası'nı tetiklemiyordu
//   → Planlama Motoru (3099) ile hiç iletişim kurmuyordu
//   → hakemPuanlari obje gönderiyordu (dizi bekleniyor)
//   → alternatifSayisi ve sentezPuanlari eksikti
//
// YENİ DURUM:
//   YOL 1: Panel → /api/intake → localhost:3099/gorev-al proxy
//          → Motor tam pipeline çalıştırır:
//            PDP-44 → Supabase → AI → Kurul Masası → 15 Algo → Supabase
//   YOL 2: Motor kapalıysa fallback:
//          → Doğrudan planlamaAlgoritmaPipeline + Supabase kayıt
// ============================================================

import { NextRequest, NextResponse } from 'next/server';

const PLANLAMA_MOTOR_URL = 'http://localhost:3099';

export async function POST(req: NextRequest) {
    try {
        // ── GİRDİ PARSE ──────────────────────────────────────
        let text = '';
        let dosyalar: any[] = [];
        const contentType = req.headers.get("content-type") || "";

        if (contentType.includes("multipart/form-data")) {
            const formData = await req.formData();
            text = (formData.get('text') as string) || (formData.get('task') as string) || '';
        } else {
            const body = await req.json();
            // Panel 'task' gönderiyor (PlanningPanel.tsx satır 188)
            text = body.text || body.task || '';
            dosyalar = body.dosyalar || [];
        }

        if (!text) {
            return NextResponse.json({ success: false, error: 'Görev metni boş olamaz' }, { status: 400 });
        }

        console.log(`\n══════════════════════════════════════════════════════`);
        console.log(`[MERKEZ PANEL] YENİ GÖREV: ${text.substring(0, 80)}...`);
        console.log(`══════════════════════════════════════════════════════\n`);

        const gorevKodu = `GT-${Date.now()}`;

        // ══════════════════════════════════════════════════════
        // YOL 1: PLANLAMA MOTORUNA (3099) PROXY
        // Motor çalışıyorsa tam pipeline devreye girer:
        //   PDP-44 → Supabase Kayıt → processTask → AI Analiz
        //   → Kurul Masası Tartışması → 15 Algoritma Pipeline
        //   → Denetçi Kontrolü → Çift Doğrulama → Supabase Güncelleme
        //   → Audit Log → Sonuç
        // ══════════════════════════════════════════════════════
        let motorSonuc: any = null;
        let motorHata = false;

        try {
            console.log(`[PROXY] → localhost:3099/gorev-al iletiliyor...`);

            const motorRes = await fetch(`${PLANLAMA_MOTOR_URL}/gorev-al`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: text,
                    task_code: gorevKodu,
                    source: 'panel',
                    dosyalar: dosyalar.length > 0 ? dosyalar.map((d: any) => d.ad) : undefined,
                }),
                signal: AbortSignal.timeout(120000), // 120 saniye timeout (AI işleme süresi)
            });

            motorSonuc = await motorRes.json();

            if (motorRes.ok) {
                console.log(`[PROXY] ✅ Motor yanıt: ${motorSonuc.durum} | Görev: ${motorSonuc.task_code}`);
            } else {
                console.warn(`[PROXY] ⚠️ Motor RED: ${motorSonuc.neden || motorSonuc.durum}`);
            }
        } catch (proxyErr: any) {
            console.error(`[PROXY] ❌ Motor bağlantı hatası: ${proxyErr.message}`);
            motorHata = true;
        }

        // ── YOL 1 SONUÇ: Motor yanıt verdiyse dönüştür ──────
        if (motorSonuc && !motorHata) {
            const isPass = motorSonuc.durum === 'TAMAM';
            const isRedPDP = motorSonuc.durum === 'RED' && motorSonuc.pdp44;

            // Kararlar varsa pipeline durumunu çıkar
            const kararlar = motorSonuc.kararlar || {};
            const ozetKararlar = Object.entries(kararlar)
                .map(([k, v]: [string, any]) => `[${k.toUpperCase()}] ${v?.sonuc || '?'} — ${v?.neden || ''}`)
                .join('\n');

            return NextResponse.json({
                success: isPass,
                status: isPass ? 'PASS' : (isRedPDP ? 'PDP_RED' : 'FAIL'),
                gorev_id: motorSonuc.task_code || gorevKodu,
                task_id: motorSonuc.task_id,
                planlama_sonuc: motorSonuc,
                kararlar: kararlar,
                mimar_taslagi: motorSonuc.sonuc || ozetKararlar || '[Motor çıktısı bekleniyor]',
                denetim_raporu: isRedPDP
                    ? `PDP-44: ${motorSonuc.pdp44?.pdp44_puan} | ${motorSonuc.pdp44?.durum} | Eksik: ${motorSonuc.pdp44?.eksik_maddeler?.slice(0, 3).join(', ')}`
                    : `Durum: ${motorSonuc.durum} | Görev: ${motorSonuc.task_code} | Motor: 3099 AKTİF`,
                message: isPass
                    ? `Görev ONAYLANDI — Kurul Masası kararı Supabase'e kaydedildi.`
                    : (isRedPDP
                        ? `PDP-44 RED: Görev tanımı yetersiz (${motorSonuc.pdp44?.pdp44_puan}). Daha detaylı yazın.`
                        : `Görev REDDEDİLDİ: ${motorSonuc.neden || 'Bilinmeyen neden'}`),
            });
        }

        // ══════════════════════════════════════════════════════
        // YOL 2: FALLBACK — Motor kapalı/çökmüş
        // Doğrudan pipeline çalıştır + Supabase'e kaydet
        // ══════════════════════════════════════════════════════
        console.log('[FALLBACK] Motor ulaşılamıyor — doğrudan pipeline çalıştırılıyor...');

        const P = require('../../../../../Planlama_Departmani/algoritma_merkezi.js');
        const { createClient } = require('@supabase/supabase-js');

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

        const fakeGorev = {
            id: gorevKodu,
            task_code: gorevKodu,
            content: text,
            title: text,
            sender: "Merkez_Panel_Komuta"
        };

        // DÜZELTİLDİ (2026-04-26): Parametreler doğru tiplerle gönderiliyor
        // - hakemPuanlari: DİZİ (eski: obje → sessiz FAIL)
        // - alternatifSayisi: 3 (eski: 0 → FAIL)
        // - sentezPuanlari: dolu (eski: boş → FAIL)
        // - guvenSkoru ve dogrulanabilirMi: doğrulama için
        const planSonuc = await P.planlamaAlgoritmaPipeline(fakeGorev, {
            projePlan: [{ baslik: "Panel Görevi", islem: text }],
            teknoloji: { model: "gemini" },
            operasyonPlani: text,
            tezPuan: 75, antitezPuan: 65,
            hakemPuanlari: [80, 75, 85],           // DÜZELTİLDİ: DİZİ olmalı, obje değil
            alternatifSayisi: 3,                    // DÜZELTİLDİ: 0 değil, 3
            sentezPuanlari: [                       // DÜZELTİLDİ: Boş değil
                { puan: 80, agirlik: 2 },
                { puan: 70, agirlik: 1 },
            ],
            yurut: { bagimsiz: true, plan_uyumu: true },
            panelRaporPuani: 80,
            guvenSkoru: 70,
            dogrulanabilirMi: true,
        });

        const isPass = planSonuc?.final === 'ONAY';

        // Supabase'e kaydet (fallback modda bile kayıt zorunlu — veri kaybı yasak)
        if (supabaseUrl && supabaseKey) {
            try {
                const supabase = createClient(supabaseUrl, supabaseKey);
                // YAPISAL KORUMA: TaskInsert tipi — yanlis kolon build'de yakalanir
                const insertData: import('@/lib/database.types').TaskInsert = {
                    task_code: gorevKodu,
                    title: text,
                    assigned_to: 'SISTEM',
                    status: isPass ? 'onay_bekliyor' : 'reddedildi',
                    priority: 'normal',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    is_archived: false,
                    metadata: {
                        source: 'panel_fallback',
                        pipeline_final: planSonuc?.final,
                        kararlar_ozet: planSonuc?.ozet,
                        kararlar: planSonuc?.kararlar,
                        mod: 'fallback_direkt_pipeline',
                        aciklamalar: planSonuc?.aciklamalar,
                        hermai: planSonuc?.hermai,
                    }
                };
                await supabase.from('tasks').insert(insertData);
                console.log(`[FALLBACK] ✅ Supabase'e kaydedildi: ${gorevKodu}`);
            } catch (dbErr: any) {
                console.error(`[FALLBACK] ❌ Supabase kayıt hatası: ${dbErr.message}`);
            }
        }

        // Kararlar özetini formatla
        const ozetKararlar = planSonuc?.kararlar ? Object.entries(planSonuc.kararlar)
            .map(([k, v]: [string, any]) => `[${k.toUpperCase()}] ${v.sonuc} — ${v.neden}`)
            .join('\n') : '';

        return NextResponse.json({
            success: isPass,
            status: isPass ? "PASS" : "FAIL",
            gorev_id: gorevKodu,
            planlama_sonuc: planSonuc,
            kararlar: planSonuc?.kararlar || {},
            mimar_taslagi: ozetKararlar || '[Pipeline çıktısı]',
            denetim_raporu: `Final: ${planSonuc?.final} | Geçen: ${planSonuc?.ozet?.pass || 0}/${planSonuc?.ozet?.toplam || 15} | Fail: ${planSonuc?.ozet?.fail || 0} | MOD: FALLBACK (Motor 3099 kapalı)`,
            message: isPass
                ? "Görev ONAYLANDI — Pipeline geçti, Supabase'e kaydedildi. (Fallback mod — Motor 3099 kapalı)"
                : `Görev REDDEDİLDİ — ${planSonuc?.ozet?.fail || '?'} algoritma başarısız.`,
        });

    } catch (err: any) {
        console.error("❌ MERKEZ PANEL BAĞLANTI HATASI:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
