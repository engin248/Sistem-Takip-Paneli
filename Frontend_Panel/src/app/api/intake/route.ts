import { NextResponse } from 'next/server';
import { aiComplete } from '@/lib/aiProvider';

// NİZAM: Basit In-Memory Spam Kalkanı
const globalStore = global as any;
if (!globalStore._lastIntakeTime) globalStore._lastIntakeTime = 0;

export async function POST(request: Request) {
    try {
        const now = Date.now();
        if (now - globalStore._lastIntakeTime < 10000) {
            return NextResponse.json({ error: "[SİSTEM KORUMASI] Aşırı komut basımı tespit edildi. 10 saniye bekleyin." }, { status: 429 });
        }

        const body = await request.json();
        const rawTask = body.task;
        const dosyalar = body.dosyalar || [];

        if (!rawTask && dosyalar.length === 0) {
            return NextResponse.json({ error: "Eksik komut! Görev/Task veya dosya belirtilmedi." }, { status: 400 });
        }
        globalStore._lastIntakeTime = now;

        const fs = await import('fs');
        const path = await import('path');

        // ──── DOSYALARI KAYDET + RESİM ANALİZİ ────
        let dosyaBilgisi = '';
        let gorselAnalizSonucu = '';
        if (dosyalar.length > 0) {
            const yukDir = path.join(process.cwd(), '..', 'Planlama_Departmani', 'yuklemeler');
            if (!fs.existsSync(yukDir)) fs.mkdirSync(yukDir, { recursive: true });
            
            for (const d of dosyalar) {
                try {
                    const base64Data = d.data.split(',')[1] || d.data;
                    const buffer = Buffer.from(base64Data, 'base64');
                    const ts = new Date().toISOString().replace(/[:.]/g, '-');
                    const dosyaAdi = `${ts}_${d.ad}`;
                    fs.writeFileSync(path.join(yukDir, dosyaAdi), buffer);
                    dosyaBilgisi += `\n[DOSYA: ${d.ad} (${d.tip}, ${(d.boyut / 1024).toFixed(1)}KB) → ${dosyaAdi}]`;
                    console.log(`[DOSYA KAYDEDILDI]: ${dosyaAdi}`);

                    // Resim ise → llava ile analiz et
                    if (d.tip && d.tip.startsWith('image/')) {
                        console.log(`[LLAVA GÖRSEL ANALİZ]: ${d.ad} analiz ediliyor...`);
                        try {
                            const ollamaRes = await fetch('http://localhost:11434/api/chat', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    model: 'llava:latest',
                                    messages: [{
                                        role: 'user',
                                        content: rawTask || 'Bu resmi analiz et. Ne görüyorsun? Detaylı açıkla.',
                                        images: [base64Data]
                                    }],
                                    stream: false,
                                    options: { temperature: 0.2 }
                                })
                            });
                            const ollamaData = await ollamaRes.json();
                            const analiz = ollamaData?.message?.content || '';
                            gorselAnalizSonucu += `\n[LLAVA GÖRSEL ANALİZİ - ${d.ad}]:\n${analiz}\n`;
                            console.log(`[LLAVA SONUÇ]: ${analiz.substring(0, 150)}...`);
                        } catch (llavaErr: any) {
                            console.error(`[LLAVA HATA]: ${llavaErr.message}`);
                            gorselAnalizSonucu += `\n[LLAVA ÇEVRIMDIŞI - ${d.ad}]: Görsel analiz yapılamadı.\n`;
                        }
                    }
                } catch (e: any) {
                    console.error(`[DOSYA HATA]: ${d.ad} — ${e.message}`);
                }
            }
        }

        const gorevMetni = (rawTask || '(Dosya gönderildi)') + dosyaBilgisi + gorselAnalizSonucu;

        console.log("==========================================");
        console.log("[PANEL] Komut alındı. Departmana gidiyor. SUPABASE YOK.");

        // ──── ADIM 1: YAPAN (Mimar - deepseek-coder-v2) ────
        console.log("[YAPAN - Mimar]: Emir analiz ediliyor...");
        const mimarResult = await aiComplete({
            systemPrompt: `Sen [YAPAN] Mimar'sın (MDS-2026). Görevi icra eden kişisin. Seçeneklere ASLA sayı SINIRI KOYAMAZSIN. Tüm alternatifleriyle plan çıkar. Eğer görsel analiz sonucu varsa onu da dikkate al. Varsayım yapmadan, en iyi planı [Proje Planı, Operasyon Sırası, Etki Alanı, Kontrol Noktaları, Teknoloji] şemasıyla çıkar.`,
            userMessage: gorevMetni,
            temperature: 0.2,
            maxTokens: 800,
        }, { ollamaModel: 'deepseek-coder-v2:latest' });

        const mimarPlan = mimarResult?.content || '[MİMAR ÇEVRİMDIŞI]';
        console.log(`[MİMAR SONUÇ]: ${mimarPlan.substring(0, 100)}...`);

        // ──── ADIM 2: YAPTIRAN (Yönetici - qwen2.5) ────
        console.log("[YAPTIRAN - Yönetici]: Yapan'ın (Mimarın) planı Nizam'a uygun mu zorlanıyor...");
        const yaptiranResult = await aiComplete({
            systemPrompt: `Sen [YAPTIRAN] (Yönetici) ajanısın. Görevin, [YAPAN] modelin çıkardığı planı Kurucu'nun katı Nizam kurallarına uymaya zorlamaktır. Eğer plan alternatifleri sayılarla kısıtlanmışsa, eksik bırakılmışsa veya kendi yetki sınırlarını aşarak dışarıdan model indirme v.b. eylemlere girmişse onu çok sert eleştir ve mükemmel haliyle yeniden YAPTIR (çiz). Eğer plana %100 uygunsa, değiştirme ve planı tekrar ver.`,
            userMessage: `YAPAN'ın Planı:\n${mimarPlan}`,
            temperature: 0.2,
            maxTokens: 800,
        }, { ollamaModel: 'qwen2.5:latest' });
        const yaptiranPlan = yaptiranResult?.content || '[YAPTIRAN ÇEVRİMDIŞI]';
        console.log(`[YAPTIRAN SONUÇ]: ${yaptiranPlan.substring(0, 100)}...`);

        // ──── ADIM 3: ONAYLAYAN (Denetçi/QA - mistral) ────
        console.log("[ONAYLAYAN - QA Denetçi]: Plan onay hattına girdi (Ya Geçer Ya Kellesi Vurulur)...");
        const denetciResult = await aiComplete({
            systemPrompt: `Sen [ONAYLAYAN] (Kalite Güvence/QA) ajanısın. Yapan ve Yaptıran mevkilerinden çıkan işi incelersin. Şayet Sistem Kurallarına en ufak bir itaatsizlik, saptırma veya sınır koyma (sayısal kısıtlama) görürsen, bilerek uymayanı DERHAL BERTARAF ET ve cevabının en başına "[İNFAZ]" kelimesini büyük harflerle koy. Kellesini anında vur. Eğer her şey %100 kusursuz kurallara tabi yapılmışsa sadece "[PASS]" yaz.`,
            userMessage: yaptiranPlan,
            temperature: 0.1,
            maxTokens: 300,
        }, { ollamaModel: 'mistral:latest' });

        const denetimRaporu = denetciResult?.content || '[DENETÇİ ÇEVRİMDIŞI]';
        const isPass = denetimRaporu.includes('[PASS]');
        console.log(`[DENETÇİ SONUÇ]: ${isPass ? 'ONAYLANDI' : 'İNFAZ'}`);

        // ──── KARARI YEREL DOSYAYA KAYDET ────
        try {
            const kararlarDir = path.join(process.cwd(), '..', 'Planlama_Departmani', 'kararlar');
            if (!fs.existsSync(kararlarDir)) fs.mkdirSync(kararlarDir, { recursive: true });
            const ts = new Date().toISOString().replace(/[:.]/g, '-');
            const karar = {
                tarih: new Date().toISOString(),
                gorev: rawTask || '(Dosya gönderildi)',
                durum: isPass ? 'PASS' : 'FAIL',
                dosyalar: dosyalar.map((d: any) => d.ad),
                gorsel_analiz: gorselAnalizSonucu || null,
                mimar_taslagi: mimarPlan,
                yaptiran_plani: yaptiranPlan,
                denetim_raporu: denetimRaporu,
                nihai_muhur: isPass ? yaptiranPlan : denetimRaporu,
                asil_tezler: { yapan: mimarPlan },
                golge_itirazlari: { yaptiran: yaptiranPlan, onaylayan: denetimRaporu },
            };
            fs.writeFileSync(path.join(kararlarDir, `KARAR_${ts}.json`), JSON.stringify(karar, null, 2), 'utf-8');
            console.log(`[KARAR KAYDEDILDI]: KARAR_${ts}.json`);
        } catch (e: any) { console.error(`[KARAR KAYIT HATA]: ${e.message}`); }

        const ciktiGorsel = gorselAnalizSonucu ? `\n\n[GÖRSEL ANALİZ]:\n${gorselAnalizSonucu}` : '';

        return NextResponse.json({
            status: isPass ? 'PASS' : 'FAIL',
            message: isPass
                ? "MDS-2026 ONAY: [Yapan] üretti, [Yaptıran] uygulattı, [Onaylayan] kalite mührünü vurdu."
                : "[SİSTEM İNFAZI] İtaatsizlik tespiti! Kelle vuruldu. Görev bertaraf edildi.",
            mimar_taslagi: mimarPlan + ciktiGorsel,
            yaptiran_plani: yaptiranPlan,
            denetim_raporu: denetimRaporu
        });

    } catch (error: any) {
        console.error("[INTAKE HATA]:", error.message);
        return NextResponse.json({ error: error.message || "İç Sunucu Hatası" }, { status: 500 });
    }
}
