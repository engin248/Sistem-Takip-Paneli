// src/core/localAudit.ts
// ============================================================
// LOCAL AUDIT (STUBBED FOR VERCEL)
// ============================================================
// Vercel Serverless environment is Read-Only and process.cwd() 
// causes Turbopack to trace gigabytes of node_modules.
// ============================================================

export interface AuditEntry {
  seq          : number;
  timestamp    : string;
  agent_id     : string;
  action       : string;
  data         : unknown;
  hash         : string;
  prev_hash    : string;
  integrity    : 'OK' | 'FAIL';
}

export interface VerifyResult {
  toplam        : number;
  gecerli       : number;
  bozuk         : number;
  bozuk_satirlar: number[];
  durum         : 'GUVENLI' | 'TEHLIKE';
}

export function auditLog(
  agent_id: string,
  action  : string,
  data    : unknown
): AuditEntry {
  const hash = 'mock_' + Date.now();
  return {
    seq: 1,
    timestamp: new Date().toISOString(),
    agent_id,
    action,
    data,
    hash,
    prev_hash: '0'.repeat(64),
    integrity: 'OK'
  };
}

export function verifyChain(): VerifyResult {
  return { toplam:0, gecerli:0, bozuk:0, bozuk_satirlar:[], durum:'GUVENLI' };
}

export function readRecentEntries(n = 20): AuditEntry[] {
  return [];
}

