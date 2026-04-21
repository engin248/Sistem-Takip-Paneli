// ============================================================
// HUMAN GATE — Kapılı Onay Mekanizması
// ============================================================
// G-1 (Görev Anlama), G-2 (İş Planı), G-6 (Kanıt), G-7 (İnsan Onay)
// kapıları için paylaşılan gate state yönetimi.
//
// Akış:
//   1. Pipeline bir kapıya ulaşır → saveCheckpoint() → ESCALATED döner
//   2. Kullanıcı panel/Telegram'dan KABUL/RED verir → confirmGate() / rejectGate()
//   3. Pipeline kaldığı yerden devam eder → resumePipeline()
//
// ÜST: pipeline.ts (kaydet/oku)
// ALT: Supabase pipeline_checkpoints tablosu
// YAN: control_engine.ts (command status güncelleme)
// ÖN: Kullanıcı onayı olmadan hiçbir kapı geçilemez
// ARKA: İzlenebilirlik + audit tamamlanma garantisi
//
// Hata Kodu: ERR-Sistem Takip Paneli030 ~ ERR-Sistem Takip Paneli039
// ============================================================

import { createHash } from 'crypto';
import { supabase } from '@/lib/supabase';
import { writeLocalAudit } from '@/lib/localAuditWriter';

// ─── TİPLER ──────────────────────────────────────────────────

export type GateId = 'G1_UNDERSTANDING' | 'G2_PLAN' | 'G6_EVIDENCE' | 'G7_HUMAN_APPROVAL';
export type GateStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

export interface CheckpointData {
    commandId:       string;
    gateId:          GateId;
    understanding?:  GateUnderstanding;
    plan?:           GatePlan;
    evidence?:       GateEvidence;
    approvalReport?: GateApprovalReport;
    pipelineState:   Record<string, unknown>;
    mode:            string;
    createdBy?:      string;
}

/** G-1: Sistemin görevi nasıl anladığı */
export interface GateUnderstanding {
    raw_command:    string;
    understood_as:  string;
    affected_system: string;
    affected_vars:  string[];
    confidence:     number;
    questions:      string[];
    methodology:    string;
    risks:          string;
}

/** G-2: İş planı */
export interface GatePlan {
    steps:          GatePlanStep[];
    total_steps:    number;
    estimated_ms:   number;
    requires_ai:    boolean;
    requires_db:    boolean;
    complexity:     'low' | 'medium' | 'high';
}

export interface GatePlanStep {
    no:              number;
    description:     string;
    responsible:     string;
    expected_output: string;
}

/** G-6: Kanıt */
export interface GateEvidence {
    items:           EvidenceItem[];
    total:           number;
    all_collected:   boolean;
}

export interface EvidenceItem {
    type:     'terminal_output' | 'screenshot' | 'url_check' | 'db_state' | 'file_hash' | 'api_response';
    content:  unknown;
    hash:     string;
    valid:    boolean;
}

/** G-7: Onay raporu */
export interface GateApprovalReport {
    summary:         string;
    criteria_score:  number;
    proof_status:    string;
    consensus:       string;
    gate_results:    Array<{ gate: string; passed: boolean }>;
    recommendation:  'APPROVE' | 'REJECT' | 'REVIEW';
}

export interface CheckpointRecord {
    id:              string;
    command_id:      string;
    gate_id:         GateId;
    status:          GateStatus;
    understanding:   GateUnderstanding | null;
    plan:            GatePlan | null;
    evidence:        GateEvidence | null;
    approval_report: GateApprovalReport | null;
    pipeline_state:  Record<string, unknown>;
    mode:            string;
    created_by:      string | null;
    decided_by:      string | null;
    decided_at:      string | null;
    reject_reason:   string | null;
    created_at:      string;
    expires_at:      string;
}

// ─── CHECKPOINT KAYDET ──────────────────────────────────────

export async function saveCheckpoint(data: CheckpointData): Promise<{
    success: boolean;
    checkpointId?: string;
    error?: string;
}> {
    try {
        // Aynı command + gate için pending varsa üzerine yaz
        await supabase
            .from('pipeline_checkpoints')
            .delete()
            .eq('command_id', data.commandId)
            .eq('gate_id', data.gateId)
            .eq('status', 'PENDING');

        const { data: record, error } = await supabase
            .from('pipeline_checkpoints')
            .insert({
                command_id:       data.commandId,
                gate_id:          data.gateId,
                status:           'PENDING',
                understanding:    data.understanding ?? null,
                plan:             data.plan ?? null,
                evidence:         data.evidence ?? null,
                approval_report:  data.approvalReport ?? null,
                pipeline_state:   data.pipelineState,
                mode:             data.mode,
                created_by:       data.createdBy ?? null,
            })
            .select('id')
            .single();

        if (error || !record) {
            return { success: false, error: error?.message ?? 'DB kayıt başarısız' };
        }

        // Command durumunu güncelle
        const statusMap: Record<GateId, string> = {
            G1_UNDERSTANDING:  'understanding_pending',
            G2_PLAN:           'plan_pending',
            G6_EVIDENCE:       'evidence_pending',
            G7_HUMAN_APPROVAL: 'approval_pending',
        };

        await supabase
            .from('commands')
            .update({ status: statusMap[data.gateId] })
            .eq('id', data.commandId);

        // Immutable log — prev_hash zincir bütünlüğü
        const { data: lastLog } = await supabase
            .from('immutable_logs')
            .select('hash')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        const hash = createHash('sha256')
            .update(data.commandId + data.gateId + Date.now())
            .digest('hex');

        await supabase.from('immutable_logs').insert({
            module:     'GATE',
            event_type: `${data.gateId}_CHECKPOINT_SAVED`,
            severity:   'info',
            payload:    { commandId: data.commandId, gateId: data.gateId, checkpointId: record.id },
            hash,
            prev_hash:  lastLog?.hash ?? '',
        });

        // Local disk audit
        writeLocalAudit({
            eventType: `${data.gateId}_CHECKPOINT_SAVED`,
            module:    'GATE',
            severity:  'info',
            commandId: data.commandId,
            payload:   { gateId: data.gateId, checkpointId: record.id },
        });

        return { success: true, checkpointId: record.id };

    } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
}

// ─── CHECKPOINT OKU ─────────────────────────────────────────
// Tüm durumları (PENDING, APPROVED, REJECTED) döndürür.
// Pipeline çağırdığında APPROVED dalına ulaşabilmesi için
// PENDING-only filtresi KALDIRILDI.

export async function loadCheckpoint(
    commandId: string,
    gateId: GateId
): Promise<CheckpointRecord | null> {
    const { data, error } = await supabase
        .from('pipeline_checkpoints')
        .select('*')
        .eq('command_id', commandId)
        .eq('gate_id', gateId)
        .in('status', ['PENDING', 'APPROVED', 'REJECTED'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error || !data) return null;

    // Süre kontrolü — sadece PENDING kayıtlar expire olur
    if (data.status === 'PENDING' && new Date(data.expires_at) < new Date()) {
        await supabase
            .from('pipeline_checkpoints')
            .update({ status: 'EXPIRED' })
            .eq('id', data.id);
        return null;
    }

    return data as CheckpointRecord;
}

// ─── KAPI ONAYLA (KABUL) ────────────────────────────────────

export async function confirmGate(
    commandId: string,
    gateId: GateId,
    decidedBy: string
): Promise<{ success: boolean; checkpoint?: CheckpointRecord; error?: string }> {
    const checkpoint = await loadCheckpoint(commandId, gateId);
    if (!checkpoint) {
        return { success: false, error: `ERR-Sistem Takip Paneli030: ${gateId} için bekleyen checkpoint bulunamadı` };
    }

    const { error } = await supabase
        .from('pipeline_checkpoints')
        .update({
            status:     'APPROVED',
            decided_by: decidedBy,
            decided_at: new Date().toISOString(),
        })
        .eq('id', checkpoint.id);

    if (error) {
        return { success: false, error: `ERR-Sistem Takip Paneli031: Onay kaydedilemedi — ${error.message}` };
    }

    // Immutable log — prev_hash zincir bütünlüğü
    const { data: lastApproveLog } = await supabase
        .from('immutable_logs')
        .select('hash')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    const hash = createHash('sha256')
        .update(commandId + gateId + 'APPROVED' + Date.now())
        .digest('hex');

    await supabase.from('immutable_logs').insert({
        module:     'GATE',
        event_type: `${gateId}_APPROVED`,
        severity:   'info',
        payload:    { commandId, gateId, decidedBy, checkpointId: checkpoint.id },
        hash,
        prev_hash:  lastApproveLog?.hash ?? '',
    });

    writeLocalAudit({
        eventType: `${gateId}_APPROVED`,
        module:    'GATE',
        severity:  'info',
        commandId,
        payload:   { gateId, decidedBy },
    });

    return { success: true, checkpoint: { ...checkpoint, status: 'APPROVED' } };
}

// ─── KAPI REDDET (RED) ──────────────────────────────────────

export async function rejectGate(
    commandId: string,
    gateId: GateId,
    decidedBy: string,
    reason: string
): Promise<{ success: boolean; error?: string }> {
    const checkpoint = await loadCheckpoint(commandId, gateId);
    if (!checkpoint) {
        return { success: false, error: `ERR-Sistem Takip Paneli032: ${gateId} için bekleyen checkpoint bulunamadı` };
    }

    await supabase
        .from('pipeline_checkpoints')
        .update({
            status:        'REJECTED',
            decided_by:    decidedBy,
            decided_at:    new Date().toISOString(),
            reject_reason: reason,
        })
        .eq('id', checkpoint.id);

    // Command durumunu failed yap
    await supabase
        .from('commands')
        .update({ status: 'failed' })
        .eq('id', commandId);

    // Immutable log — prev_hash zincir bütünlüğü
    const { data: lastRejectLog } = await supabase
        .from('immutable_logs')
        .select('hash')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    const hash = createHash('sha256')
        .update(commandId + gateId + 'REJECTED' + Date.now())
        .digest('hex');

    await supabase.from('immutable_logs').insert({
        module:     'GATE',
        event_type: `${gateId}_REJECTED`,
        severity:   'warning',
        payload:    { commandId, gateId, decidedBy, reason, checkpointId: checkpoint.id },
        hash,
        prev_hash:  lastRejectLog?.hash ?? '',
    });

    writeLocalAudit({
        eventType: `${gateId}_REJECTED`,
        module:    'GATE',
        severity:  'warning',
        commandId,
        payload:   { gateId, decidedBy, reason },
    });

    return { success: true };
}

// ─── PENDING CHECKPOINT LİSTESİ ─────────────────────────────

export async function getPendingCheckpoints(): Promise<CheckpointRecord[]> {
    const { data, error } = await supabase
        .from('pipeline_checkpoints')
        .select('*')
        .eq('status', 'PENDING')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(20);

    if (error || !data) return [];
    return data as CheckpointRecord[];
}
