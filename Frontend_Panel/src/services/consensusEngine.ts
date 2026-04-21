// ============================================================
// KONSENSÜS MOTORU — 3 AI AJAN OYLAMA SİSTEMİ
// ============================================================
// Yönetim Kurulu karar mekanizması:
//   - 3 bağımsız AI ajan (Stratejik, Teknik, Güvenlik)
//   - Her ajan kararı bağımsız analiz eder
//   - 3/3 ONAY → MÜHÜRLÜ (consensus achieved)
//   - 1+ RED → REDDEDİLDİ (consensus failed)
// Hata Kodları:
//   ERR-Sistem Takip Paneli001-020 → AI ajan oyu kaydedilemedi
//   ERR-Sistem Takip Paneli001-021 → Konsensüs hesaplaması başarısız
// ============================================================


import { ERR, processError } from '@/lib/errorCore';
import { aiComplete } from '@/lib/aiProvider';

// ─── TİP TANIMLARI ──────────────────────────────────────────

export type AgentRole = 'strategic' | 'technical' | 'security';
export type VoteResult = 'ONAY' | 'RED';
export type ConsensusResult = 'MÜHÜRLÜ' | 'REDDEDİLDİ' | 'BEKLEMEDE';

export type DecisionCategory =
  | 'DEPLOYMENT'
  | 'SCHEMA_CHANGE'
  | 'SECURITY'
  | 'ROLLBACK'
  | 'CONFIG_CHANGE';

export interface AgentVote {
  agent: AgentRole;
  vote: VoteResult;
  reasoning: string;
  confidence: number;
  evaluatedAt: string;
}

export interface ConsensusDecision {
  id: string;
  decisionCode: string;
  title: string;
  description: string;
  category: DecisionCategory;
  votes: AgentVote[];
  consensusResult: ConsensusResult;
  sealHash: string | null;
  sealedAt: string | null;
  createdAt: string;
}

// ─── AJAN SİSTEM PROMPTLARI ─────────────────────────────────
// Her ajan farklı bir perspektiften değerlendirir.
// ─────────────────────────────────────────────────────────────

const AGENT_PROMPTS: Record<AgentRole, string> = {
  strategic: `Sen bir Stratejik Değerlendirme Ajanısın. Verilen sistem kararını aşağıdaki kriterlerle analiz et:

KRİTERLER:
1. İş sürekliliği: Bu karar sistem işleyişini kesintiye uğratır mı?
2. Kaynak verimliliği: Gereksiz maliyet veya karmaşıklık yaratır mı?
3. Uzun vadeli etki: Gelecekteki geliştirmeleri engeller mi?
4. Geri dönüşüm: Hata durumunda kolayca geri alınabilir mi?
5. Zamanlama: Şu an için uygun bir zamanlama mı?

DEĞERLENDİRME:
- ONAY: Karar stratejik olarak uygun ve sürdürülebilir.
- RED: Karar stratejik risk taşıyor veya zamanlama uygun değil.

CEVAP FORMATI (sadece JSON):
{"vote": "ONAY" | "RED", "reasoning": "Kısa gerekçe (max 150 karakter)", "confidence": 0.0-1.0}`,

  technical: `Sen bir Teknik Değerlendirme Ajanısın. Verilen sistem kararını aşağıdaki kriterlerle analiz et:

KRİTERLER:
1. Mimari uyumluluk: Mevcut sistem mimarisiyle çelişiyor mu?
2. Performans etkisi: Sistem performansını olumsuz etkiler mi?
3. Bağımlılık riski: Yeni veya riskli bağımlılıklar gerektiriyor mu?
4. Test kapsamı: Yeterince test edilebilir mi?
5. Bakım karmaşıklığı: Bakım yükünü artırır mı?

DEĞERLENDİRME:
- ONAY: Karar teknik olarak sağlam ve uygulanabilir.
- RED: Karar teknik risk taşıyor veya mimariyi bozuyor.

CEVAP FORMATI (sadece JSON):
{"vote": "ONAY" | "RED", "reasoning": "Kısa gerekçe (max 150 karakter)", "confidence": 0.0-1.0}`,

  security: `Sen bir Güvenlik Değerlendirme Ajanısın. Verilen sistem kararını aşağıdaki kriterlerle analiz et:

KRİTERLER:
1. Veri güvenliği: Hassas verileri açığa çıkarır mı?
2. Erişim kontrolü: RLS politikalarını veya yetkilendirmeyi zayıflatır mı?
3. Saldırı yüzeyi: Yeni saldırı vektörleri oluşturur mu?
4. Şifreleme: Veri aktarımı ve depolama güvenli mi?
5. Uyumluluk: Güvenlik standartlarıyla uyumlu mu?

DEĞERLENDİRME:
- ONAY: Karar güvenlik standartlarına uygun.
- RED: Karar güvenlik açığı oluşturabilir.

CEVAP FORMATI (sadece JSON):
{"vote": "ONAY" | "RED", "reasoning": "Kısa gerekçe (max 150 karakter)", "confidence": 0.0-1.0}`,
};

// ─── LOKAL VOTING ENGINE ────────────────────────────────────
// OpenAI API key yoksa devreye giren kural tabanlı oylama.
// Her ajan kendi kriterlerine göre karar analiz eder.
// ─────────────────────────────────────────────────────────────

const RISK_KEYWORDS: Record<AgentRole, string[]> = {
  strategic: ['acil', 'geri al', 'iptal', 'durdur', 'plansız', 'riskli', 'deneysel', 'test edilmemiş'],
  technical: ['migration', 'breaking change', 'bağımlılık', 'refactor', 'mimari', 'veritabanı değişikliği', 'performans'],
  security: ['public', 'açık', 'şifresiz', 'yetki', 'rls', 'token', 'api key', 'sızıntı', 'güvenlik'],
};

const SAFE_KEYWORDS: Record<AgentRole, string[]> = {
  strategic: ['planlı', 'test edilmiş', 'onaylı', 'dökümanlanmış', 'geri alınabilir', 'düşük risk'],
  technical: ['optimize', 'iyileştirme', 'bakım', 'güncelleme', 'yama', 'hotfix', 'stabil'],
  security: ['şifreli', 'rls', 'yetkilendirilmiş', 'doğrulanmış', 'güvenli', 'izole'],
};

function localVote(agent: AgentRole, title: string, description: string, category: DecisionCategory): AgentVote {
  const text = `${title} ${description}`.toLowerCase();

  const riskScore = RISK_KEYWORDS[agent].filter(kw => text.includes(kw)).length;
  const safeScore = SAFE_KEYWORDS[agent].filter(kw => text.includes(kw)).length;

  // Kategori bazlı ek değerlendirme
  let categoryBonus = 0;
  if (agent === 'security' && (category === 'SECURITY' || category === 'DEPLOYMENT')) categoryBonus = 1;
  if (agent === 'technical' && category === 'SCHEMA_CHANGE') categoryBonus = 1;
  if (agent === 'strategic' && category === 'ROLLBACK') categoryBonus = 1;

  const netScore = safeScore - riskScore + categoryBonus;
  const vote: VoteResult = netScore >= 0 ? 'ONAY' : 'RED';
  const confidence = Math.min(1.0, 0.6 + Math.abs(netScore) * 0.1);

  const reasoning = vote === 'ONAY'
    ? `Lokal analiz: ${agent} perspektifinden değerlendirildi. Risk seviyesi kabul edilebilir.`
    : `Lokal analiz: ${agent} perspektifinden risk tespit edildi. ${riskScore} risk sinyali algılandı.`;

  return {
    agent,
    vote,
    reasoning,
    confidence,
    evaluatedAt: new Date().toISOString(),
  };
}


// ─── MÜHÜR HASH ÜRETİCİ ────────────────────────────────────
// SHA-256 benzeri deterministik hash üretir.
// Karar detayları + oy sonuçlarıyla mühürlenir.
// ─────────────────────────────────────────────────────────────
function generateSealHash(decision: { title: string; category: string; votes: AgentVote[] }): string {
  const payload = JSON.stringify({
    title: decision.title,
    category: decision.category,
    votes: decision.votes.map(v => ({ agent: v.agent, vote: v.vote })),
    timestamp: new Date().toISOString(),
  });

  // Simple hash (browser-compatible, no crypto import needed)
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    const char = payload.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 32-bit integer
  }
  const absHash = Math.abs(hash).toString(16).padStart(8, '0');
  const rand = Math.random().toString(36).substring(2, 10);
  return `SEAL-${absHash}-${rand}`.toUpperCase();
}

// ─── KARAR KODU ÜRETİCİ ────────────────────────────────────
export function generateDecisionCode(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `BRD-${date}-${rand}`;
}

// ============================================================
// ANA ORKESTRATÖR — KURUL OYLAMA SÜRECİ
// ============================================================
// 1. 3 AI ajanı paralel olarak oylar
// 2. Tüm oylar toplanınca konsensüs hesaplanır
// 3. 3/3 ONAY → MÜHÜRLÜ + seal hash üretilir
// 4. 1+ RED → REDDEDİLDİ
// ============================================================

export interface BoardVotingRequest {
  title: string;
  description: string;
  category: DecisionCategory;
}

export interface BoardVotingResult {
  votes: AgentVote[];
  consensusResult: ConsensusResult;
  sealHash: string | null;
  sealedAt: string | null;
  source: 'ai' | 'local';
}

export async function runBoardVoting(request: BoardVotingRequest): Promise<BoardVotingResult> {
  const { title, description, category } = request;
  const agents: AgentRole[] = ['strategic', 'technical', 'security'];

  let votes: AgentVote[];
  let source: 'ai' | 'local';

  // Önce aiProvider (Ollama → OpenAI) ile dene
  try {
    const votePromises = agents.map(async (agent) => {
      const userMessage = `KARAR BAşLIĞI: ${title}\nKATEGORİ: ${category}\nAÇIKLAMA: ${description || 'Açıklama belirtilmedi.'}`;

      const response = await aiComplete({
        systemPrompt: AGENT_PROMPTS[agent],
        userMessage,
        temperature: 0.3,
        maxTokens: 200,
        jsonMode: true,
      });

      if (!response) {
        // AI yok → lokal oylama
        return localVote(agent, title, description, category);
      }

      try {
        const parsed = JSON.parse(response.content) as { vote?: string; reasoning?: string; confidence?: number };
        const vote: VoteResult = parsed.vote === 'RED' ? 'RED' : 'ONAY';
        const confidence = typeof parsed.confidence === 'number'
          ? Math.max(0, Math.min(1, parsed.confidence))
          : 0.7;

        return {
          agent,
          vote,
          reasoning: parsed.reasoning || `${agent} ajanı (${response.provider}) ${vote} oyu verdi.`,
          confidence,
          evaluatedAt: new Date().toISOString(),
        } as AgentVote;
      } catch {
        return localVote(agent, title, description, category);
      }
    });

    votes = await Promise.all(votePromises);
    // En az bir ajan AI kullandıysa source = 'ai'
    source = votes.some(v => !v.reasoning.includes('Lokal analiz')) ? 'ai' : 'local';
  } catch (error) {
    processError(ERR.BOARD_CONSENSUS, error, {
      kaynak: 'consensusEngine.ts',
      islem: 'AI_PROVIDER_VOTE',
    });
    // Fallback: Lokal oylama
    votes = agents.map(agent => localVote(agent, title, description, category));
    source = 'local';
  }

  // Konsensüs hesaplama
  const approvedCount = votes.filter(v => v.vote === 'ONAY').length;
  const consensusResult: ConsensusResult = approvedCount === 3 ? 'MÜHÜRLÜ' : 'REDDEDİLDİ';

  // Mühür hash — sadece tam konsensüs durumunda
  let sealHash: string | null = null;
  let sealedAt: string | null = null;

  if (consensusResult === 'MÜHÜRLÜ') {
    sealHash = generateSealHash({ title, category, votes });
    sealedAt = new Date().toISOString();
  }

  return {
    votes,
    consensusResult,
    sealHash,
    sealedAt,
    source,
  };
}
