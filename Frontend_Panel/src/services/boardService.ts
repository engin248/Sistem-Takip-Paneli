// ============================================================
// BOARD SERVICE — Yönetim Kurulu Karar Yönetimi (Supabase)
// ============================================================
// board_decisions tablosu ile CRUD işlemleri.
// Her karar konsensüs motoru tarafından oylanır ve mühürlenir.
// Hata Kodları:
//   ERR-Sistem Takip Paneli001-018 → Karar oluşturulamadı
//   ERR-Sistem Takip Paneli001-019 → Kararlar çekilemedi
//   ERR-Sistem Takip Paneli001-022 → Mühür uygulanamadı
// ============================================================

import { supabase, validateSupabaseConnection } from '@/lib/supabase';
import { ERR, processError } from '@/lib/errorCore';
import { logAudit } from './auditService';
import {
  runBoardVoting,
  generateDecisionCode,
  type BoardVotingRequest,
  type DecisionCategory,
  type AgentVote,
  type ConsensusResult,
} from './consensusEngine';
import { CONTROL } from '@/core/control_engine';


// ─── TİP TANIMLARI ──────────────────────────────────────────

export interface BoardDecisionRecord {
  id: string;
  decision_code: string;
  title: string;
  description: string | null;
  category: DecisionCategory;
  status: 'pending' | 'approved' | 'rejected' | 'sealed';
  requested_by: string;

  // AI Agent Oyları
  agent_strategic_vote: string | null;
  agent_strategic_reason: string | null;
  agent_strategic_confidence: number | null;
  agent_strategic_at: string | null;

  agent_technical_vote: string | null;
  agent_technical_reason: string | null;
  agent_technical_confidence: number | null;
  agent_technical_at: string | null;

  agent_security_vote: string | null;
  agent_security_reason: string | null;
  agent_security_confidence: number | null;
  agent_security_at: string | null;

  // Konsensüs
  consensus_result: ConsensusResult | null;
  seal_hash: string | null;
  sealed_at: string | null;
  vote_source: 'ai' | 'local' | null;

  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ─── BAĞLANTI ÖN KONTROLÜ ──────────────────────────────────

function isConnectionValid(): boolean {
  const { isValid } = validateSupabaseConnection();
  return isValid;
}

// ============================================================
// KARAR OLUŞTURMA VE OYLAMA
// ============================================================
// 1. Supabase'e karar kaydı oluşturulur (status: pending)
// 2. Konsensüs motoru çağrılır (3 AI ajan paralel oylama)
// 3. Sonuç Supabase'e geri yazılır
// 4. Audit log'a mühürlenir
// ============================================================

export interface CreateDecisionRequest {
  title: string;
  description?: string;
  category: DecisionCategory;
}

export interface CreateDecisionResult {
  success: boolean;
  decision?: BoardDecisionRecord;
  error?: string;
}

export async function createAndVoteDecision(request: CreateDecisionRequest): Promise<CreateDecisionResult> {
  if (!isConnectionValid()) {
    processError(ERR.CONNECTION_INVALID, new Error('Bağlantı eksik'), {
      tablo: 'board_decisions', islem: 'CREATE_AND_VOTE',
    }, 'CRITICAL');
    return { success: false, error: 'Veritabanı bağlantı bilgileri eksik.' };
  }

  const decisionCode = generateDecisionCode();

  try {
    // 1. Supabase'e başlangıç kaydı
    const { data: insertData, error: insertError } = await supabase
      .from('board_decisions')
      .insert([{
        decision_code: decisionCode,
        title: request.title,
        description: request.description || null,
        category: request.category,
        status: 'pending',
        requested_by: 'OPERATÖR',
      }])
      .select()
      .single();

    if (insertError) {
      processError(ERR.BOARD_CREATE, insertError, {
        tablo: 'board_decisions', islem: 'INSERT', decision_code: decisionCode,
      });
      return { success: false, error: insertError.message };
    }

    // 2. Konsensüs motoru — 3 AI ajan paralel oylama
    const votingRequest: BoardVotingRequest = {
      title: request.title,
      description: request.description || '',
      category: request.category,
    };

    const votingResult = await runBoardVoting(votingRequest);

    // 3. Oy sonuçlarını ayıkla
    const strategicVote = votingResult.votes.find(v => v.agent === 'strategic');
    const technicalVote = votingResult.votes.find(v => v.agent === 'technical');
    const securityVote = votingResult.votes.find(v => v.agent === 'security');

    const newStatus = votingResult.consensusResult === 'MÜHÜRLÜ' ? 'sealed'
      : votingResult.consensusResult === 'REDDEDİLDİ' ? 'rejected'
      : 'pending';

    // 4. Supabase'e oylama sonucunu yaz
    const { data: updateData, error: updateError } = await supabase
      .from('board_decisions')
      .update({
        status: newStatus,
        agent_strategic_vote: strategicVote?.vote || null,
        agent_strategic_reason: strategicVote?.reasoning || null,
        agent_strategic_confidence: strategicVote?.confidence || null,
        agent_strategic_at: strategicVote?.evaluatedAt || null,
        agent_technical_vote: technicalVote?.vote || null,
        agent_technical_reason: technicalVote?.reasoning || null,
        agent_technical_confidence: technicalVote?.confidence || null,
        agent_technical_at: technicalVote?.evaluatedAt || null,
        agent_security_vote: securityVote?.vote || null,
        agent_security_reason: securityVote?.reasoning || null,
        agent_security_confidence: securityVote?.confidence || null,
        agent_security_at: securityVote?.evaluatedAt || null,
        consensus_result: votingResult.consensusResult,
        seal_hash: votingResult.sealHash,
        sealed_at: votingResult.sealedAt,
        vote_source: votingResult.source,
        updated_at: new Date().toISOString(),
      })
      .eq('id', insertData.id)
      .select()
      .single();

    if (updateError) {
      processError(ERR.BOARD_SEAL, updateError, {
        tablo: 'board_decisions', islem: 'UPDATE', decision_id: insertData.id,
      });
      return { success: false, error: updateError.message };
    }

    // 5. Audit log
    await logAudit({
      operation_type: 'EXECUTE',
      action_description: `Kurul kararı ${votingResult.consensusResult}: "${request.title}" [${decisionCode}]`,
      metadata: {
        action_code: 'BOARD_DECISION',
        decision_code: decisionCode,
        category: request.category,
        consensus: votingResult.consensusResult,
        seal_hash: votingResult.sealHash,
        vote_source: votingResult.source,
        votes: votingResult.votes.map(v => ({ agent: v.agent, vote: v.vote })),
      },
    }).catch(() => {});

    return { success: true, decision: updateData as BoardDecisionRecord };
  } catch (err) {
    processError(ERR.UNIDENTIFIED_COLLAPSE, err, {
      tablo: 'board_decisions', islem: 'CREATE_AND_VOTE', context: 'boardService',
    }, 'FATAL');
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ============================================================
// KARAR GEÇMİŞİ
// ============================================================

export async function fetchBoardDecisions(): Promise<BoardDecisionRecord[]> {
  if (!isConnectionValid()) {
    processError(ERR.CONNECTION_INVALID, new Error('Bağlantı eksik'), {
      tablo: 'board_decisions', islem: 'SELECT',
    }, 'CRITICAL');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('board_decisions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      processError(ERR.BOARD_FETCH, error, {
        tablo: 'board_decisions', islem: 'SELECT',
      });
      return [];
    }

    return data as BoardDecisionRecord[];
  } catch (err) {
    processError(ERR.UNIDENTIFIED_COLLAPSE, err, {
      tablo: 'board_decisions', islem: 'SELECT', context: 'fetchBoardDecisions',
    }, 'FATAL');
    return [];
  }
}
