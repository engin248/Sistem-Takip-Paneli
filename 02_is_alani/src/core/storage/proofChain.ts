// ============================================================
// HERMAİ PROOF CHAIN — Faz 14: Immutable Kanıt Zinciri
// ============================================================
// Dosya sistemi KULLANILMAZ (Vercel'de kalıcı değil).
// Zincir Supabase audit_logs tablosuna yazılır (IMMUTABLE).
// Her kayıt bir önceki kaydın hash'ini taşır → kırılamaz zincir.
// ============================================================

import crypto from 'crypto';
import { supabase } from '@/lib/supabase';
import { ERR, processError, generateUID } from '@/lib/errorCore';
import { logAudit } from '@/services/auditService';

// ─── TİP TANIMLARI ──────────────────────────────────────────
export interface ProofEntry {
  uid: string;
  operation: string;
  input_hash: string;
  intent_hash: string;
  criteria_score: number;
  verified: boolean;
  proof: string;
  context: Record<string, unknown>;
}

export interface ChainEntry extends ProofEntry {
  prevHash: string;
  currentHash: string;
  timestamp: string;
  chainIndex: number;
}

// ─── PROOF ZİNCİRİ ──────────────────────────────────────────
export class ProofChain {

  // SHA-256 hash hesapla
  private computeHash(entry: ProofEntry, prevHash: string): string {
    const data = JSON.stringify(entry) + prevHash;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  // Girdiyi hash'le (gizlilik için ham metin tutulmaz)
  static hashInput(input: string): string {
    return crypto.createHash('sha256').update(input).digest('hex');
  }

  // Zincire yeni kayıt ekle
  async addToChain(entry: ProofEntry): Promise<ChainEntry | null> {
    try {
      // Son zincir kaydını al (önceki hash için)
      const { data: lastEntries } = await supabase
        .from('audit_logs')
        .select('details')
        .eq('action_code' as string, 'SYSTEM_' as string)
        .order('timestamp', { ascending: false })
        .limit(50);

      // details->action_code = 'HERMAI_PROOF_CHAIN' olan son kayıt
      const lastMeta = (lastEntries ?? [])
        .map(r => (r as Record<string, unknown>).details as Record<string, unknown>)
        .find(d => d?.action_code === 'HERMAI_PROOF_CHAIN');

      const prevHash: string = (lastMeta?.currentHash as string)
        ?? '0000000000000000000000000000000000000000000000000000000000000000';

      // Zincir indeksini hesapla
      const allEntries = (lastEntries ?? []).filter(r => {
        const d = (r as Record<string, unknown>).details as Record<string, unknown>;
        return d?.action_code === 'HERMAI_PROOF_CHAIN';
      });
      const chainIndex = allEntries.length;
      const currentHash = this.computeHash(entry, prevHash);

      const chainEntry: ChainEntry = {
        ...entry,
        prevHash,
        currentHash,
        timestamp: new Date().toISOString(),
        chainIndex,
      };

      // Supabase audit_logs'a yaz (IMMUTABLE)
      await logAudit({
        operation_type: 'SYSTEM',
        action_description: `HermAI Proof zinciri #${chainIndex}: ${entry.operation}`,
        metadata: {
          action_code: 'HERMAI_PROOF_CHAIN',
          proof_chain: true,
          ...chainEntry,
        },
      });

      return chainEntry;
    } catch (error) {
      processError(ERR.PROOF_CHAIN_BREAK, error, {
        kaynak: 'proofChain.ts',
        islem: 'ADD_TO_CHAIN',
        operation: entry.operation,
      }, 'CRITICAL');
      return null;
    }
  }

  // Zincir bütünlüğünü doğrula
  async verifyChain(): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('details, timestamp')
        .order('timestamp', { ascending: true });

      // Sadece proof chain kayıtlarını filtrele
      const proofData = (data ?? []).filter(r => {
        const d = (r as Record<string, unknown>).details as Record<string, unknown>;
        return d?.action_code === 'HERMAI_PROOF_CHAIN';
      });

      if (error) {
        processError(ERR.PROOF_CHAIN_BREAK, new Error(error.message), {
          kaynak: 'proofChain.ts',
          islem: 'VERIFY_CHAIN',
        }, 'CRITICAL');
        return false;
      }

      if (!proofData || proofData.length <= 1) return true; // 0-1 kayıt → geçerli

      for (let i = 1; i < proofData.length; i++) {
        const currentDetails = (proofData[i] as Record<string, unknown>).details as ChainEntry;
        const prevDetails = (proofData[i - 1] as Record<string, unknown>).details as ChainEntry;

        if (!currentDetails || !prevDetails) continue;

        if (currentDetails.prevHash !== prevDetails.currentHash) {
          processError(ERR.PROOF_CHAIN_BREAK, new Error(`Zincir kırıldı: index ${i}`), {
            kaynak: 'proofChain.ts',
            islem: 'VERIFY_CHAIN',
            broken_at_index: i,
            expected_prev_hash: prevDetails.currentHash,
            got_prev_hash: currentDetails.prevHash,
          }, 'CRITICAL');
          return false;
        }
      }

      return true;
    } catch (error) {
      processError(ERR.PROOF_CHAIN_BREAK, error, {
        kaynak: 'proofChain.ts',
        islem: 'VERIFY_CHAIN',
      }, 'CRITICAL');
      return false;
    }
  }

  // Yeni ProofEntry oluştur (kısayol fonksiyon)
  static createEntry(
    operation: string,
    input: string,
    intent: Record<string, unknown>,
    criteriaScore: number,
    verified: boolean,
    proofString: string,
    context: Record<string, unknown> = {}
  ): ProofEntry {
    return {
      uid: generateUID(),
      operation,
      input_hash: ProofChain.hashInput(input),
      intent_hash: ProofChain.hashInput(JSON.stringify(intent)),
      criteria_score: criteriaScore,
      verified,
      proof: proofString,
      context,
    };
  }
}
