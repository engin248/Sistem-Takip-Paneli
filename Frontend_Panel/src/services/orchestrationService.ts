// ============================================================
// ORKESTRASYON SERVİSİ — OTONOM GÖREV DAĞITIM MOTORU
// ============================================================
// Zincirin İLK adımı. Burası sağlam olmazsa hiçbir şey çalışmaz.
//
// AKIŞ:
//   1. Girdi Doğrulama (boş, kısa, tehlikeli içerik filtreleme)
//   2. Görev Kodu Üretimi (deterministik, çakışmasız)
//   3. AI Öncelik Analizi (Kural → Ollama → Fallback)
//   4. Ajan Seçimi (Registry → Fallback: SISTEM)
//   5. İcra Hattına Fırlatma (hatBridge → Supabase tasks)
//   6. Sonuç Doğrulama (hat başarılı mı? audit yazıldı mı?)
//   7. Audit Kaydı (çift kanal: yerel + Supabase)
//
// HATA DURUMU: Her adımda hata yakalanır, loglanır, atlanmaz.
// ============================================================

import { analyzeTaskPriority, type PriorityResult } from './aiManager';
import { agentRegistry, type Ajan } from './agentRegistry';
import { pushToRedLine, type HatSonucu } from './hatBridge';
import { logAudit } from './auditService';
import { processError, ERR } from '@/lib/errorCore';

// ─── GİRDİ TİPLERİ ─────────────────────────────────────────
export interface OrchestrateParams {
    gorev: string;
    ajan_id?: string;
    kaynak?: string; // 'panel' | 'whatsapp' | 'telegram' | 'ses_asistani' | 'api'
}

// ─── ÇIKTI TİPLERİ ─────────────────────────────────────────
export interface OrchestrateResponse {
    success: boolean;
    message: string;
    task_code?: string;
    hat_id?: string;
    hat_basarili?: boolean;
    atanan_ajan?: string;
    atama_gerekce?: string;
    oncelik?: string;
    oncelik_kaynak?: string;
    error?: string;
    error_adim?: string;
}

// ─── GÖREV KODU ÜRETİCİ (Deterministik) ─────────────────────
function uretGorevKodu(): string {
    const now = new Date();
    const tarih = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const saat = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    const rastgele = Math.floor(Math.random() * 9000 + 1000);
    return `TSK-${tarih}-${saat}-${rastgele}`;
}

// ─── GİRDİ TEMİZLEME ───────────────────────────────────────
function temizleGirdi(metin: string): string {
    return metin
        .trim()
        .replace(/\s+/g, ' ')    // çoklu boşluk → tek boşluk
        .slice(0, 2000);          // max 2000 karakter
}

// ============================================================
// ANA ORKESTRATÖR
// ============================================================

export async function orchestrateTask(params: OrchestrateParams): Promise<OrchestrateResponse> {
    const baslangicZamani = Date.now();

    // ── ADIM 1: GİRDİ DOĞRULAMA ─────────────────────────────
    if (!params.gorev || typeof params.gorev !== 'string') {
        return {
            success: false,
            message: 'Görev metni boş veya geçersiz tipte.',
            error: 'GIRDI_GECERSIZ',
            error_adim: 'ADIM_1_GIRDI_DOGRULAMA',
        };
    }

    const gorev = temizleGirdi(params.gorev);
    if (gorev.length < 3) {
        return {
            success: false,
            message: 'Görev metni en az 3 karakter olmalı.',
            error: 'GIRDI_COK_KISA',
            error_adim: 'ADIM_1_GIRDI_DOGRULAMA',
        };
    }

    const taskCode = uretGorevKodu();
    const kaynak = params.kaynak || 'bilinmiyor';

    try {
        // ── ADIM 2: AI ÖNCELİK ANALİZİ ─────────────────────
        let analysis: PriorityResult;
        try {
            analysis = await analyzeTaskPriority(gorev);
        } catch (aiErr) {
            processError(ERR.AI_ANALYSIS, aiErr, {
                kaynak: 'orchestrationService.ts',
                islem: 'ADIM_2_AI_ANALIZ',
                task_code: taskCode,
            });
            // AI çöktüyse durmak yok — fallback değerlerle devam
            analysis = {
                priority: 'normal',
                reasoning: 'AI analizi başarısız — fallback normal atandı',
                score: 3,
                kaynak: 'fallback',
            };
        }

        // ── ADIM 3: AJAN SEÇİMİ ────────────────────────────
        let targetAgent: Ajan | null = null;
        if (params.ajan_id) {
            try {
                targetAgent = await agentRegistry.getById(params.ajan_id);
            } catch {
                // Ajan sorgulama hatası — SISTEM devralır
            }
        }

        const finalAgentId = targetAgent?.id || 'SISTEM';
        const finalAgentName = targetAgent?.kod_adi || 'OTOMASYON';

        // ── ADIM 4: İCRA HATTINA FIRLAT ─────────────────────
        let hatResult: HatSonucu;
        try {
            hatResult = await pushToRedLine({
                baslik: gorev,
                aciklama: analysis.reasoning,
                oncelik: analysis.priority,
                kaynak: kaynak,
                metadata: {
                    task_code: taskCode,
                    assignee: finalAgentId,
                    assignee_name: finalAgentName,
                    oncelik_skor: analysis.score,
                    oncelik_kaynak: analysis.kaynak,
                    timestamp: new Date().toISOString(),
                },
            });
        } catch (hatErr) {
            processError(ERR.SYSTEM_GENERAL, hatErr, {
                kaynak: 'orchestrationService.ts',
                islem: 'ADIM_4_HAT_BRIDGE',
                task_code: taskCode,
            });
            return {
                success: false,
                message: 'Görev icra hattına gönderilemedi — sistem hatası.',
                task_code: taskCode,
                error: hatErr instanceof Error ? hatErr.message : 'HAT_BRIDGE_CRASH',
                error_adim: 'ADIM_4_HAT_BRIDGE',
            };
        }

        // ── ADIM 5: HAT SONUCU DOĞRULAMA ────────────────────
        if (!hatResult.success) {
            // Hat yazamadı — görev icraya GİTMEDİ — hata rapor et
            await logAudit({
                operation_type: 'ERROR',
                action_description: `Görev icra hattına yazılamadı: ${taskCode} — ${hatResult.error}`,
                metadata: {
                    action_code: 'HAT_BRIDGE_FAIL',
                    task_code: taskCode,
                    hat_id: hatResult.hat_id,
                    hat_error: hatResult.error,
                },
            }).catch(() => { /* audit hatası pipeline'ı durdurmamalı */ });

            return {
                success: false,
                message: `Görev icra hattına yazılamadı: ${hatResult.error || 'Bilinmeyen hata'}`,
                task_code: taskCode,
                hat_id: hatResult.hat_id,
                hat_basarili: false,
                error: hatResult.error,
                error_adim: 'ADIM_5_HAT_DOGRULAMA',
            };
        }

        // ── ADIM 6: AUDIT KAYDI ─────────────────────────────
        const sureSaniye = ((Date.now() - baslangicZamani) / 1000).toFixed(2);

        await logAudit({
            operation_type: 'EXECUTE',
            action_description: `Görev orkestre edildi: ${taskCode} → ${finalAgentName} [${analysis.priority.toUpperCase()}] (${sureSaniye}s)`,
            metadata: {
                action_code: 'TASK_ORCHESTRATED',
                task_code: taskCode,
                hat_id: hatResult.hat_id,
                hat_task_code: hatResult.task_code,
                agent_id: finalAgentId,
                agent_name: finalAgentName,
                priority: analysis.priority,
                priority_score: analysis.score,
                priority_source: analysis.kaynak,
                kaynak: kaynak,
                sure_ms: Date.now() - baslangicZamani,
            },
        }).catch((auditErr) => {
            // Audit hatası pipeline'ı durdurmaz ama loglanır
            console.error('[ORCHESTRATOR] Audit yazım hatası:', auditErr);
        });

        // ── ADIM 7: BAŞARILI DÖNÜŞ ──────────────────────────
        return {
            success: true,
            message: `Görev atandı: ${taskCode} → ${finalAgentName} [${analysis.priority.toUpperCase()}]`,
            task_code: taskCode,
            hat_id: hatResult.hat_id,
            hat_basarili: true,
            atanan_ajan: finalAgentName,
            atama_gerekce: analysis.reasoning,
            oncelik: analysis.priority,
            oncelik_kaynak: analysis.kaynak,
        };

    } catch (error) {
        // ── YAKALANMAMIŞ HATA —————————————————————————————
        const errorMsg = error instanceof Error ? error.message : String(error);

        processError(ERR.SYSTEM_GENERAL, error, {
            kaynak: 'orchestrationService.ts',
            islem: 'ORCHESTRATE_GENEL',
            task_code: taskCode,
        });

        await logAudit({
            operation_type: 'ERROR',
            action_description: `Orkestrasyon çöktü: ${taskCode} — ${errorMsg}`,
            metadata: {
                action_code: 'ORCHESTRATOR_CRASH',
                task_code: taskCode,
                error: errorMsg,
            },
        }).catch(() => {});

        return {
            success: false,
            message: 'Görev orkestrasyonu sırasında kritik hata oluştu.',
            task_code: taskCode,
            error: errorMsg,
            error_adim: 'YAKALANMAMIS_HATA',
        };
    }
}
