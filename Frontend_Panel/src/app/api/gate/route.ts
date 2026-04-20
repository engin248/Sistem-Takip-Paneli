// src/app/api/gate/route.ts
// Gate Onay/Red API — G-1, G-2, G-6, G-7 kapıları için
//
// POST /api/gate — Kapı onayla veya reddet
// GET  /api/gate — Bekleyen kapıları listele

import { NextRequest, NextResponse } from 'next/server';
import {
    confirmGate, rejectGate, getPendingCheckpoints,
    type GateId,
} from '@/core/humanGate';
import { executePipeline } from '@/core/pipeline';
import type { CommandContext } from '@/core/types';
import crypto from 'crypto';
import { supabase } from '@/lib/supabase';

export const runtime = 'nodejs';

const VALID_GATES: GateId[] = ['G1_UNDERSTANDING', 'G2_PLAN', 'G6_EVIDENCE', 'G7_HUMAN_APPROVAL'];

// ── POST: Kapı onay/red ──────────────────────────────────────
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { commandId, gateId, action, reason, userId } = body;

        // Validasyon
        if (!commandId || !gateId || !action) {
            return NextResponse.json(
                { error: 'ERR-GATE-001: commandId, gateId, action zorunlu' },
                { status: 400 }
            );
        }

        if (!VALID_GATES.includes(gateId)) {
            return NextResponse.json(
                { error: `ERR-GATE-002: Geçersiz gateId. Geçerli: ${VALID_GATES.join(', ')}` },
                { status: 400 }
            );
        }

        if (action !== 'APPROVE' && action !== 'REJECT') {
            return NextResponse.json(
                { error: 'ERR-GATE-003: action APPROVE veya REJECT olmalı' },
                { status: 400 }
            );
        }

        const decidedBy = userId || 'panel-user';

        // REJECT
        if (action === 'REJECT') {
            const result = await rejectGate(commandId, gateId, decidedBy, reason || 'Kullanıcı tarafından reddedildi');
            return NextResponse.json({
                status: result.success ? 'REJECTED' : 'ERROR',
                gateId,
                commandId,
                error: result.error,
            });
        }

        // APPROVE
        const confirmResult = await confirmGate(commandId, gateId, decidedBy);
        if (!confirmResult.success) {
            return NextResponse.json(
                { status: 'ERROR', error: confirmResult.error },
                { status: 400 }
            );
        }

        // Onay sonrası pipeline'ı kaldığı yerden devam ettir
        let resumeResult = null;
        try {
            // Command'ın raw_text'ini al
            const { data: cmd } = await supabase
                .from('commands')
                .select('raw_text, user_id, channel')
                .eq('id', commandId)
                .single();

            if (cmd) {
                const pipelineState = confirmResult.checkpoint?.pipeline_state ?? {};
                const mode = (pipelineState.mode as string) || 'NORMAL';

                const context: CommandContext = {
                    userId:       cmd.user_id || decidedBy,
                    channel:      (cmd.channel as CommandContext['channel']) || 'panel',
                    isAuthorized: true,
                    role:         'admin',
                    scope:        ['all'],
                    nonce:        crypto.randomBytes(16).toString('hex'),
                    isVoice:      false,
                };

                // Pipeline tekrar çağrıldığında, onaylanan kapı geçilecek
                // (loadCheckpoint APPROVED dönecek → pipeline devam edecek)
                resumeResult = await executePipeline(
                    cmd.raw_text,
                    context,
                    mode as 'STRICT' | 'NORMAL' | 'SAFE'
                );
            }
        } catch (resumeErr) {
            console.error('[GATE] Pipeline resume hatası:', resumeErr);
        }

        return NextResponse.json({
            status:    'APPROVED',
            gateId,
            commandId,
            pipeline:  resumeResult ? {
                status:    resumeResult.status,
                stage:     resumeResult.stage,
                pendingGate: resumeResult.pendingGate,
            } : null,
        });

    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Bilinmeyen hata';
        return NextResponse.json(
            { error: msg, status: 'ERROR' },
            { status: 500 }
        );
    }
}

// ── GET: Bekleyen kapıları listele ─────────────────────────────
export async function GET() {
    try {
        const checkpoints = await getPendingCheckpoints();
        return NextResponse.json({
            count: checkpoints.length,
            checkpoints: checkpoints.map(cp => ({
                id:           cp.id,
                commandId:    cp.command_id,
                gateId:       cp.gate_id,
                status:       cp.status,
                understanding: cp.understanding,
                plan:          cp.plan,
                evidence:      cp.evidence,
                approvalReport: cp.approval_report,
                createdAt:     cp.created_at,
                expiresAt:     cp.expires_at,
            })),
        });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Bilinmeyen hata';
        return NextResponse.json(
            { error: msg, status: 'ERROR' },
            { status: 500 }
        );
    }
}
