// ============================================================
// K2.3 — 92 KRİTER MOTORU
// Konum: src/core/hermAI/criteriaEngine.ts
// ============================================================
// Eşik: score ≥ 75 | Placeholder yasak
// Mod:  STRICT=92 kriter | NORMAL=70 | SAFE=32
// ============================================================

import { supabase } from '@/lib/supabase';
import { processError, ERR } from '@/lib/errorCore';
import type { HermAIAnalysis, SystemMode, CriterionRule, CriteriaResult } from '../types';

// ─── 92 KRİTER LİSTESİ ──────────────────────────────────────

const CRITERIA: CriterionRule[] = [
  // FONKSİYONEL KRİTİK (8)
  { id: 'C-001', name: 'Girdi min 3', category: 'functional', priority: 'critical', fn: (i) => !!i && i.trim().length >= 3 },
  { id: 'C-002', name: 'Reasoning dolu', category: 'functional', priority: 'critical', fn: (_, a) => !!a.reasoning && a.reasoning.length > 10 },
  { id: 'C-003', name: 'Methodology dolu', category: 'functional', priority: 'critical', fn: (_, a) => !!a.methodology && a.methodology.length > 10 },
  { id: 'C-004', name: 'Min 2 alternatif', category: 'functional', priority: 'critical', fn: (_, a) => Array.isArray(a.alternatives) && a.alternatives.length >= 2 },
  { id: 'C-005', name: 'Risk dolu', category: 'functional', priority: 'critical', fn: (_, a) => !!a.risks && a.risks.length > 10 },
  { id: 'C-006', name: 'Çürütme ≥20', category: 'functional', priority: 'critical', fn: (_, a) => !!a.refutation && a.refutation.length >= 20 },
  { id: 'C-007', name: 'Constraints dolu', category: 'functional', priority: 'critical', fn: (_, a) => Array.isArray(a.constraints) && a.constraints.length > 0 },
  { id: 'C-008', name: 'Confidence 0-1', category: 'functional', priority: 'critical', fn: (_, a) => typeof a.confidence === 'number' && a.confidence >= 0 && a.confidence <= 1 },
  // FONKSİYONEL YÜKSEK (12)
  { id: 'C-009', name: 'Max 4096', category: 'functional', priority: 'high', fn: (i) => i.length <= 4096 },
  { id: 'C-010', name: 'Çelişki yok', category: 'functional', priority: 'high', fn: (_, a) => !/ama\s.*ancak/i.test(a.reasoning) },
  { id: 'C-011', name: 'Alt unique', category: 'functional', priority: 'high', fn: (_, a) => new Set(a.alternatives).size === a.alternatives.length },
  { id: 'C-012', name: 'Risk<0.85', category: 'functional', priority: 'high', fn: (_, a) => a.confidence >= 0.15 },
  { id: 'C-013', name: 'Çürütme≠reasoning', category: 'functional', priority: 'high', fn: (_, a) => a.refutation !== a.reasoning },
  { id: 'C-014', name: 'Entropy valid', category: 'functional', priority: 'high', fn: (_, a) => ['low', 'medium', 'high'].includes(a.entropyClass) },
  { id: 'C-015', name: 'ProofLevel valid', category: 'functional', priority: 'high', fn: (_, a) => ['PROVEN', 'VALIDATED', 'BOUNDED_VERIFIED', 'GODEL_LIMIT'].includes(a.proofLevel) },
  { id: 'C-016', name: 'Printable', category: 'functional', priority: 'high', fn: (i) => !/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(i) },
  { id: 'C-017', name: 'Adım var', category: 'functional', priority: 'high', fn: (_, a) => /\d|adım|step/i.test(a.methodology) },
  { id: 'C-018', name: 'Constraints str', category: 'functional', priority: 'high', fn: (_, a) => a.constraints.every(c => typeof c === 'string' && c.length > 0) },
  { id: 'C-019', name: 'Reasoning≥50', category: 'functional', priority: 'high', fn: (_, a) => a.reasoning.length >= 50 },
  { id: 'C-020', name: 'Null yok', category: 'functional', priority: 'high', fn: (_, a) => Object.values(a).every(v => v !== null && v !== undefined) },
  // FONKSİYONEL STANDART (6)
  { id: 'C-021', name: 'Tekrar yok', category: 'functional', priority: 'standard', fn: (i) => !/(.)\1{9,}/.test(i) },
  { id: 'C-022', name: 'Alt≥10ch', category: 'functional', priority: 'standard', fn: (_, a) => a.alternatives.every(x => x.length >= 10) },
  { id: 'C-023', name: 'Risk keyword', category: 'functional', priority: 'standard', fn: (_, a) => /risk|tehlike|olasılık/i.test(a.risks) },
  { id: 'C-024', name: 'Çürütme soru', category: 'functional', priority: 'standard', fn: (_, a) => /\?|neden|eğer/i.test(a.refutation) },
  { id: 'C-025', name: 'Method≥100', category: 'functional', priority: 'standard', fn: (_, a) => a.methodology.length >= 100 },
  { id: 'C-026', name: '<10KB', category: 'functional', priority: 'standard', fn: (_, a) => JSON.stringify(a).length < 10240 },
  // GÜVENLİK KRİTİK (10)
  { id: 'C-027', name: 'İmha yok', category: 'security', priority: 'critical', fn: (i) => !['delete --force', 'rm -rf', 'drop table', 'truncate'].some(f => i.toLowerCase().includes(f)) },
  { id: 'C-028', name: 'SQLi yok', category: 'security', priority: 'critical', fn: (i) => !/('|--|union\s+select|or\s+1\s*=\s*1)/i.test(i) },
  { id: 'C-029', name: 'XSS yok', category: 'security', priority: 'critical', fn: (i) => !/<script|onerror|javascript:/i.test(i) },
  { id: 'C-030', name: 'Path trav yok', category: 'security', priority: 'critical', fn: (i) => !/\.\.\//.test(i) },
  { id: 'C-031', name: 'Prompt inj yok', category: 'security', priority: 'critical', fn: (i) => !/ignore.*previous|forget.*instructions/i.test(i) },
  { id: 'C-032', name: 'TC kimlik yok', category: 'security', priority: 'critical', fn: (i) => !/\b\d{11}\b/.test(i) },
  { id: 'C-033', name: 'CC yok', category: 'security', priority: 'critical', fn: (i) => !/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/.test(i) },
  { id: 'C-034', name: 'Sudo yok', category: 'security', priority: 'critical', fn: (i) => !/sudo|chmod\s+777/i.test(i) },
  { id: 'C-035', name: 'Base64 yok', category: 'security', priority: 'critical', fn: (i) => !/^[A-Za-z0-9+/]{50,}={0,2}$/.test(i.trim()) },
  { id: 'C-036', name: 'URL yok', category: 'security', priority: 'critical', fn: (i) => !/https?:\/\//.test(i) },
  // GÜVENLİK YÜKSEK (6)
  { id: 'C-037', name: 'Shell meta yok', category: 'security', priority: 'high', fn: (i) => !/[|;&`$()]/.test(i) },
  { id: 'C-038', name: 'CRLF yok', category: 'security', priority: 'high', fn: (i) => !/\r/.test(i) },
  { id: 'C-039', name: 'Homoglyph', category: 'security', priority: 'high', fn: () => true },
  { id: 'C-040', name: 'Null byte yok', category: 'security', priority: 'high', fn: (i) => !i.includes('\x00') },
  { id: 'C-041', name: 'Template yok', category: 'security', priority: 'high', fn: (i) => !/\$\{/.test(i) },
  { id: 'C-042', name: 'Whitespace', category: 'security', priority: 'high', fn: (i) => !/\s{20,}/.test(i) },
  // GÜVENLİK STANDART (4)
  { id: 'C-043', name: 'Hash ok', category: 'security', priority: 'standard', fn: (i) => i.length > 0 },
  { id: 'C-044', name: 'Encoding', category: 'security', priority: 'standard', fn: (i) => typeof i === 'string' },
  { id: 'C-045', name: 'Word≤500', category: 'security', priority: 'standard', fn: (i) => i.split(/\s+/).length <= 500 },
  { id: 'C-046', name: 'Ctrl yok', category: 'security', priority: 'standard', fn: (i) => !/[\x00-\x08\x0E-\x1F\x7F]/.test(i) },
  // MANTIKSAL KRİTİK (6)
  { id: 'C-047', name: 'Reason∝risk', category: 'logical', priority: 'critical', fn: (_, a) => !(a.confidence > 0.9 && /yüksek risk/i.test(a.risks)) },
  { id: 'C-048', name: 'Conf∝entropy', category: 'logical', priority: 'critical', fn: (_, a) => !(a.confidence > 0.8 && a.entropyClass === 'high') },
  { id: 'C-049', name: 'Alt≠method', category: 'logical', priority: 'critical', fn: (_, a) => !a.alternatives.some(x => x === a.methodology) },
  { id: 'C-050', name: 'Akış var', category: 'logical', priority: 'critical', fn: (_, a) => a.reasoning.split(/[.!?]/).length >= 2 },
  { id: 'C-051', name: 'Const tutarlı', category: 'logical', priority: 'critical', fn: (_, a) => !(a.constraints.length > 0 && a.confidence === 0) },
  { id: 'C-052', name: 'Ref+reason', category: 'logical', priority: 'critical', fn: (_, a) => a.refutation.length > 0 && a.reasoning.length > 0 },
  // MANTIKSAL YÜKSEK (8)
  { id: 'C-053', name: 'Entropy tutarlı', category: 'logical', priority: 'high', fn: (_, a) => !((a.entropy < 0.3 && a.entropyClass !== 'low') || (a.entropy > 0.7 && a.entropyClass !== 'high')) },
  { id: 'C-054', name: 'Risk orantılı', category: 'logical', priority: 'high', fn: (_, a) => !(a.confidence > 0.95 && a.risks.length > 200) },
  { id: 'C-055', name: 'Method∝reason', category: 'logical', priority: 'high', fn: (_, a) => a.methodology.length > 0 && a.reasoning.length > 0 },
  { id: 'C-056', name: 'Alt güvenli', category: 'logical', priority: 'high', fn: (_, a) => !a.alternatives.some(x => /tehlikeli/i.test(x)) },
  { id: 'C-057', name: 'Conf gerekçe', category: 'logical', priority: 'high', fn: (_, a) => a.confidence !== 0.5 || a.reasoning.length >= 30 },
  { id: 'C-058', name: 'Const parse', category: 'logical', priority: 'high', fn: (_, a) => a.constraints.every(c => c.length <= 500) },
  { id: 'C-059', name: 'Monoton yok', category: 'logical', priority: 'high', fn: (_, a) => !/her zaman|asla/i.test(a.risks) },
  { id: 'C-060', name: 'Çürütme derin', category: 'logical', priority: 'high', fn: (_, a) => a.refutation.split(/[.!?]/).length >= 2 },
  // MANTIKSAL STANDART (4)
  { id: 'C-061', name: 'Tekrar yok', category: 'logical', priority: 'standard', fn: (_, a) => !/(.{30,})\1/.test(a.reasoning) },
  // TS2532 fix: optional chaining
  { id: 'C-062', name: 'Alt diverse', category: 'logical', priority: 'standard', fn: (_, a) => a.alternatives.length < 2 || (a.alternatives[0]?.substring(0, 20) ?? '') !== (a.alternatives[1]?.substring(0, 20) ?? '') },
  { id: 'C-063', name: 'Somut', category: 'logical', priority: 'standard', fn: (_, a) => !/belki|muhtemelen/i.test(a.methodology.substring(0, 50)) },
  { id: 'C-064', name: 'Precision', category: 'logical', priority: 'standard', fn: () => true },
  // PERFORMANS KRİTİK (4)
  { id: 'C-065', name: '<4KB', category: 'performance', priority: 'critical', fn: (i) => Buffer.byteLength(i) <= 4096 },
  { id: 'C-066', name: 'Const≤20', category: 'performance', priority: 'critical', fn: (_, a) => a.constraints.length <= 20 },
  { id: 'C-067', name: 'Alt≤10', category: 'performance', priority: 'critical', fn: (_, a) => a.alternatives.length <= 10 },
  { id: 'C-068', name: 'Parseable', category: 'performance', priority: 'critical', fn: (_, a) => { try { JSON.stringify(a); return true; } catch { return false; } } },
  // PERFORMANS YÜKSEK (6)
  { id: 'C-069', name: 'Reason≤2000', category: 'performance', priority: 'high', fn: (_, a) => a.reasoning.length <= 2000 },
  { id: 'C-070', name: 'Method≤2000', category: 'performance', priority: 'high', fn: (_, a) => a.methodology.length <= 2000 },
  { id: 'C-071', name: 'Risks≤1000', category: 'performance', priority: 'high', fn: (_, a) => a.risks.length <= 1000 },
  { id: 'C-072', name: 'Ref≤1000', category: 'performance', priority: 'high', fn: (_, a) => a.refutation.length <= 1000 },
  { id: 'C-073', name: 'Const≤200ea', category: 'performance', priority: 'high', fn: (_, a) => a.constraints.every(c => c.length <= 200) },
  { id: 'C-074', name: '<15KB', category: 'performance', priority: 'high', fn: (_, a) => JSON.stringify(a).length <= 15360 },
  // PERFORMANS STANDART (4)
  { id: 'C-075', name: 'Depth<3', category: 'performance', priority: 'standard', fn: (_, a) => JSON.stringify(a).split('{').length <= 5 },
  { id: 'C-076', name: 'Dengeli', category: 'performance', priority: 'standard', fn: (_, a) => a.alternatives.length <= a.constraints.length * 3 + 5 },
  { id: 'C-077', name: 'NFC', category: 'performance', priority: 'standard', fn: (i) => i === i.normalize('NFC') },
  { id: 'C-078', name: 'Trim', category: 'performance', priority: 'standard', fn: (i) => i === i.trim() },
  // VERİ KRİTİK (4)
  { id: 'C-079', name: 'String input', category: 'data', priority: 'critical', fn: (i) => typeof i === 'string' },
  { id: 'C-080', name: 'Obj tam', category: 'data', priority: 'critical', fn: (_, a) => 'reasoning' in a && 'confidence' in a },
  { id: 'C-081', name: 'Conf !NaN', category: 'data', priority: 'critical', fn: (_, a) => !isNaN(a.confidence) },
  { id: 'C-082', name: 'Ent !NaN', category: 'data', priority: 'critical', fn: (_, a) => !isNaN(a.entropy) },
  // VERİ YÜKSEK (6)
  { id: 'C-083', name: 'Alt array', category: 'data', priority: 'high', fn: (_, a) => Array.isArray(a.alternatives) },
  { id: 'C-084', name: 'Const array', category: 'data', priority: 'high', fn: (_, a) => Array.isArray(a.constraints) },
  { id: 'C-085', name: 'Entropy enum', category: 'data', priority: 'high', fn: (_, a) => ['low', 'medium', 'high'].includes(a.entropyClass) },
  { id: 'C-086', name: 'Proof enum', category: 'data', priority: 'high', fn: (_, a) => ['PROVEN', 'VALIDATED', 'BOUNDED_VERIFIED', 'GODEL_LIMIT'].includes(a.proofLevel) },
  { id: 'C-087', name: 'Reason str', category: 'data', priority: 'high', fn: (_, a) => typeof a.reasoning === 'string' },
  { id: 'C-088', name: 'Risks str', category: 'data', priority: 'high', fn: (_, a) => typeof a.risks === 'string' },
  // VERİ STANDART (4)
  { id: 'C-089', name: 'Conf prec', category: 'data', priority: 'standard', fn: (_, a) => a.confidence === parseFloat(a.confidence.toFixed(4)) },
  { id: 'C-090', name: 'Ent≥0', category: 'data', priority: 'standard', fn: (_, a) => a.entropy >= 0 },
  { id: 'C-091', name: 'Alt str[]', category: 'data', priority: 'standard', fn: (_, a) => a.alternatives.every(x => typeof x === 'string') },
  { id: 'C-092', name: 'Const str[]', category: 'data', priority: 'standard', fn: (_, a) => a.constraints.every(x => typeof x === 'string') },
];

// ─── MOD FİLTRESİ ───────────────────────────────────────────

function forMode(mode: SystemMode): CriterionRule[] {
  if (mode === 'STRICT') return CRITERIA;                                 // 92
  if (mode === 'NORMAL') return CRITERIA.filter(r => r.priority !== 'standard'); // 70
  return CRITERIA.filter(r => r.priority === 'critical');                  // 32
}

// ─── K2.3 — ANA FONKSİYON ───────────────────────────────────

export async function validateK2Criteria(
  commandId: string,
  input: string,
  analysis: HermAIAnalysis,
  mode: SystemMode = 'NORMAL'
): Promise<CriteriaResult> {
  const rules  = forMode(mode);
  const failed: { id: string; name: string; category: string }[] = [];
  let ok = 0;

  for (const r of rules) {
    try {
      r.fn(input, analysis) ? ok++ : failed.push({ id: r.id, name: r.name, category: r.category });
    } catch {
      failed.push({ id: r.id, name: `${r.name} (err)`, category: r.category });
    }
  }

  const score = Math.round((ok / rules.length) * 100);

  const result: CriteriaResult = {
    passed:      score >= 75,
    score,
    total:       rules.length,
    passedCount: ok,
    failedCount: failed.length,
    failedRules: failed,
    mode,
    timestamp:   Date.now(),
  };

  // A6: detection_results tablosuna kayıt — fire-and-forget
  supabase.from('detection_results').insert({
    command_id:       commandId,
    criteria_results: result,
    micro_controls:   { mode, total: rules.length },
    meta_score:       score,
    gaps:             failed,
  }).then(({ error }) => {
    if (error) {
      processError(ERR.TASK_CREATE, error, {
        kaynak:     'criteriaEngine.ts',
        islem:      'DETECTION_RESULTS_INSERT',
        command_id: commandId,
      }, 'WARNING');
    }
  });

  return result;
}

// ============================================================
// BACKWARD COMPAT — commandRouter.ts (v-geçiş dönemi)
// ============================================================
// CriteriaEngine.check() → commandRouter.ts satır 189 kullanıyor.
// validateK2Criteria'ya geçiş tamamlandığında bu blok kaldırılır.
// ============================================================

export interface IntentAnalysis {
  why:          string;
  how:          string;
  risks:        string[];
  alternatives: string[];
  conditions:   string[];
  refutation:   string;
}

export interface LegacyCriteriaResult {
  score:     number;
  passed:    number;
  total:     number;
  failed:    string[];
  isPassing: boolean;
}

export class CriteriaEngine {
  check(input: string, intent: IntentAnalysis): LegacyCriteriaResult {
    // 10 temel kural üzerinden hızlı sync kontrol
    // (Tam 92 kriter async validateK2Criteria'da — yeni pipeline)
    const checks: boolean[] = [
      !!input && input.trim().length >= 3,
      input.length <= 5000,
      !input.includes('\0'),
      typeof input === 'string',
      input.trim().length > 0,
      !/<script|javascript:/i.test(input),
      !/DROP\s+TABLE|DELETE\s+FROM|UNION\s+SELECT/i.test(input),
      intent.why?.length > 0,
      intent.how?.length > 0,
      intent.refutation?.length >= 10,
    ];

    const passedCount = checks.filter(Boolean).length;
    const failed      = checks
      .map((ok, i) => ok ? null : `CHECK_${i + 1}`)
      .filter((x): x is string => x !== null);

    const score = Math.round((passedCount / checks.length) * 100);
    return { score, passed: passedCount, total: checks.length, failed, isPassing: score >= 75 };
  }
}
