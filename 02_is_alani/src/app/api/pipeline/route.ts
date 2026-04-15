// src/app/api/pipeline/route.ts
// Next.js API Route — V-FINAL Pipeline Endpoint
// POST /api/pipeline

import { NextRequest, NextResponse } from 'next/server';
import { executePipeline } from '@/core';
import type { CommandContext } from '@/core';
import crypto from 'crypto';

export const runtime = 'nodejs'; // Z3 WASM için gerekli (Edge DEĞİL)

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { input, mode = 'NORMAL', userId, channel = 'panel' } = body;

        if (!input || typeof input !== 'string') {
            return NextResponse.json(
                { error: 'ERR-API-001: input alanı zorunlu (string)' },
                { status: 400 }
            );
        }

        const context: CommandContext = {
            userId:       userId || 'panel-user',
            channel,
            isAuthorized: true,
            role:         'admin',
            scope:        ['all'],
            nonce:        crypto.randomBytes(16).toString('hex'),
            isVoice:      false,
        };

        const result = await executePipeline(input, context, mode);

        return NextResponse.json({
            status:    result.status,
            stage:     result.stage,
            commandId: result.commandId,
            totalMs:   result.totalMs,
            criteria: result.criteria ? {
                score:  result.criteria.score,
                passed: result.criteria.passed,
                mode:   result.criteria.mode,
            } : null,
            proof: result.proof ? {
                status:   result.proof.status,
                verified: result.proof.verified,
                degraded: result.proof.degraded,
            } : null,
            consensus: result.consensus ? {
                decision:   result.consensus.decision,
                confidence: result.consensus.confidence,
                vetoUsed:   result.consensus.vetoUsed,
            } : null,
            gateCheck: result.gateCheck ? {
                allPassed:  result.gateCheck.allPassed,
                failedGate: result.gateCheck.failedGate,
            } : null,
            errors: result.errors,
        });

    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Bilinmeyen hata';
        return NextResponse.json(
            { error: msg, status: 'ERROR' },
            { status: 500 }
        );
    }
}
