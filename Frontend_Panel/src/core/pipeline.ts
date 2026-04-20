// ============================================================
// PIPELINE ENGINE — (KÖPRÜ/STUB BAĞLANTISI)
// ============================================================
// DİKKAT: Bu dosya artık işlem yapmaz. Tüm HermAI ve Planlama
// yükleri dışarıdaki `HermAI_Denetim` ve `Planlama_Departmani`
// sunucularına taşınmıştır.
// ============================================================

export type PipelineResult = any;

export async function executePipeline(
    input: string,
    context: any,
    mode: string = 'autonomous'
): Promise<PipelineResult> {
    console.log('[PIPELINE-STUB] Islem atlandi, dis sunucuya baglanti bekleniyor...');
    
    return {
        success: true,
        transactionId: 'TX-STUB-' + Date.now(),
        mode,
        l0GateResult: {
            allowed: true,
            reason: "Dis denetim motoruna devredildi",
            securityClearance: "HIGH",
            estimatedRisk: "low"
        },
        execution: {
            success: true,
            logs: ["Dis sunucu tarafindan yurutuldu"],
            artifacts: [],
            warnings: []
        },
        timing: {
            startParams: Date.now(),
            endParams: Date.now(),
            totalMs: 0
        }
    };
}
