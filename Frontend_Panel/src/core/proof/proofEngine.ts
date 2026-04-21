// STUB — Proof Engine artık bağımsız modül (STP_Denetim/)
export async function solveProof(_spec: unknown): Promise<{ solved: boolean; hash: string }> {
  return { solved: true, hash: 'stub-proof-hash' };
}

export async function verifyProof(_spec: unknown): Promise<{ verified: boolean; v1_rule: boolean; v2_ai: boolean; proof: string }> {
  return { verified: true, v1_rule: true, v2_ai: true, proof: 'STUB: Proof bağımsız modüle taşındı' };
}
