"use client";
import { useState, useEffect, useCallback } from "react";
import { useLanguageStore } from "@/store/useLanguageStore";
import { t } from "@/lib/i18n";
import { ERR, processError } from "@/lib/errorCore";
import { toast } from "sonner";

// ============================================================
// BOARD PANEL — Yönetim Kurulu Konsensüs Arayüzü
// ============================================================
// 3 AI ajan (Stratejik, Teknik, Güvenlik) oylama sonuçlarını
// görselleştirir. Tam konsensüs → MÜHÜRLÜ, herhangi RED → REDDEDİLDİ.
// ============================================================

interface AgentVoteDisplay {
  agent: string;
  vote: string | null;
  reason: string | null;
  confidence: number | null;
  at: string | null;
}

interface BoardDecision {
  id: string;
  decision_code: string;
  title: string;
  description: string | null;
  category: string;
  status: string;
  consensus_result: string | null;
  seal_hash: string | null;
  sealed_at: string | null;
  vote_source: string | null;
  created_at: string;
  // Agent votes
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
}

type DecisionCategory = 'DEPLOYMENT' | 'SCHEMA_CHANGE' | 'SECURITY' | 'ROLLBACK' | 'CONFIG_CHANGE';

const CATEGORIES: DecisionCategory[] = ['DEPLOYMENT', 'SCHEMA_CHANGE', 'SECURITY', 'ROLLBACK', 'CONFIG_CHANGE'];

export default function BoardPanel() {
  const { lang, dir } = useLanguageStore();
  const tr = t(lang);
  const [decisions, setDecisions] = useState<BoardDecision[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<DecisionCategory>("DEPLOYMENT");

  // Kararları yükle
  const loadDecisions = useCallback(async () => {
    try {
      const response = await fetch("/api/board/decide");
      const data = await response.json();
      if (data.success) {
        setDecisions(data.decisions || []);
      }
    } catch (err) {
      processError(ERR.BOARD_FETCH, err, {
        kaynak: "BoardPanel.loadDecisions",
        islem: "FETCH",
      });
    }
  }, []);

  useEffect(() => {
    loadDecisions();
  }, [loadDecisions]);

  // Karar oluşturma
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/board/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), description: description.trim(), category }),
      });

      const data = await response.json();

      if (data.success) {
        const decision = data.decision;
        const isSealed = decision?.consensus_result === "MÜHÜRLÜ";
        if (isSealed) {
          toast.success(`✅ MÜHÜRLÜ: ${title} [${decision.seal_hash}]`);
        } else {
          toast.error(`❌ REDDEDİLDİ: ${title}`);
        }
        setTitle("");
        setDescription("");
        setShowForm(false);
        await loadDecisions();
      } else {
        toast.error(`Kurul hatası: ${data.error}`);
      }
    } catch (err) {
      processError(ERR.BOARD_CREATE, err, {
        kaynak: "BoardPanel.handleSubmit",
        islem: "POST",
      });
      toast.error("Kurul kararı işlenirken hata oluştu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Ajan oylarını çıkar
  function getVotes(d: BoardDecision): AgentVoteDisplay[] {
    return [
      {
        agent: "strategic",
        vote: d.agent_strategic_vote,
        reason: d.agent_strategic_reason,
        confidence: d.agent_strategic_confidence,
        at: d.agent_strategic_at,
      },
      {
        agent: "technical",
        vote: d.agent_technical_vote,
        reason: d.agent_technical_reason,
        confidence: d.agent_technical_confidence,
        at: d.agent_technical_at,
      },
      {
        agent: "security",
        vote: d.agent_security_vote,
        reason: d.agent_security_reason,
        confidence: d.agent_security_confidence,
        at: d.agent_security_at,
      },
    ];
  }

  // Kategori çevirisi
  function getCategoryLabel(cat: string): string {
    const map: Record<string, string> = {
      DEPLOYMENT: tr.boardCatDeploy,
      SCHEMA_CHANGE: tr.boardCatSchema,
      SECURITY: tr.boardCatSecurity,
      ROLLBACK: tr.boardCatRollback,
      CONFIG_CHANGE: tr.boardCatConfig,
    };
    return map[cat] || cat;
  }

  // Ajan label'ı
  function getAgentLabel(agent: string): string {
    const map: Record<string, string> = {
      strategic: tr.boardAgentStrategic,
      technical: tr.boardAgentTechnical,
      security: tr.boardAgentSecurity,
    };
    return map[agent] || agent;
  }

  // Oy rengi
  function getVoteColor(vote: string | null): string {
    if (vote === "ONAY") return "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800";
    if (vote === "RED") return "text-red-600 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";
    return "text-slate-400 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700";
  }

  // Konsensüs rengi
  function getConsensusStyle(result: string | null): string {
    if (result === "MÜHÜRLÜ") return "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700";
    if (result === "REDDEDİLDİ") return "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-300 dark:border-red-700";
    return "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700";
  }

  function getConsensusLabel(result: string | null): string {
    if (result === "MÜHÜRLÜ") return tr.boardConsensusSealed;
    if (result === "REDDEDİLDİ") return tr.boardConsensusRejected;
    return tr.boardConsensusWaiting;
  }

  return (
    <section className="mb-12">
      {/* Başlık */}
      <div className={`flex justify-between items-center mb-6 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
        <div>
          <h2 className="text-sm font-bold text-slate-500 tracking-widest uppercase text-start">
            {tr.boardTitle}
          </h2>
          <p className="text-[10px] text-slate-400 mt-0.5 text-start">{tr.boardSubtitle}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-[10px] font-bold bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2 rounded-lg hover:opacity-90 transition-all uppercase tracking-wider"
        >
          {showForm ? "✕" : tr.boardNewDecision}
        </button>
      </div>

      {/* Karar Formu */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-8 p-5 bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl space-y-4"
        >
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 text-start">
              {tr.boardDecisionTitle}
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder={tr.boardDecisionTitle}
              disabled={isSubmitting}
              dir={dir}
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 text-start">
              {tr.boardDecisionDesc}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none h-20"
              placeholder={tr.boardDecisionDesc}
              disabled={isSubmitting}
              dir={dir}
            />
          </div>

          <div className={`flex gap-4 items-end ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 text-start">
                {tr.boardCategory}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as DecisionCategory)}
                className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg p-2.5 text-sm outline-none text-start"
                disabled={isSubmitting}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {getCategoryLabel(cat)}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="bg-blue-600 text-white text-[10px] font-bold px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-all uppercase tracking-wider disabled:opacity-50 whitespace-nowrap"
            >
              {isSubmitting ? tr.boardSubmitting : tr.boardSubmit}
            </button>
          </div>

          {/* Oylama animasyonu */}
          {isSubmitting && (
            <div className="flex items-center justify-center gap-6 py-4">
              {["strategic", "technical", "security"].map((agent, i) => (
                <div key={agent} className="flex flex-col items-center gap-2">
                  <div
                    className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-lg animate-pulse"
                    style={{ animationDelay: `${i * 300}ms` }}
                  >
                    {agent === "strategic" ? "🎯" : agent === "technical" ? "⚙️" : "🛡️"}
                  </div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase">
                    {tr.boardVoteWaiting}
                  </span>
                </div>
              ))}
            </div>
          )}
        </form>
      )}

      {/* Karar Geçmişi */}
      <div className="space-y-4">
        {decisions.length === 0 && (
          <p className="text-[10px] text-slate-400 italic text-start">{tr.boardNoDecisions}</p>
        )}

        {decisions.map((decision) => {
          const votes = getVotes(decision);
          return (
            <div
              key={decision.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all"
            >
              {/* Karar başlığı */}
              <div className={`p-4 flex justify-between items-start ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
                <div className="flex-1 min-w-0">
                  <div className={`flex items-center gap-2 mb-1 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
                    <span className="text-[9px] font-mono text-blue-600 font-bold">{decision.decision_code}</span>
                    <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full">
                      {getCategoryLabel(decision.category)}
                    </span>
                    {decision.vote_source && (
                      <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase ${
                        decision.vote_source === "ai"
                          ? "bg-purple-100 dark:bg-purple-900/30 text-purple-600"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                      }`}>
                        {decision.vote_source === "ai" ? "AI" : "LOCAL"}
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm text-start">{decision.title}</h3>
                  {decision.description && (
                    <p className="text-[11px] text-slate-500 mt-1 text-start">{decision.description}</p>
                  )}
                </div>

                {/* Konsensüs durumu */}
                <div className={`shrink-0 ${dir === "rtl" ? "me-0 ms-4" : "ms-4"}`}>
                  <span className={`text-[9px] font-bold px-3 py-1.5 rounded-full border ${getConsensusStyle(decision.consensus_result)}`}>
                    {decision.consensus_result === "MÜHÜRLÜ" ? "🔏 " : decision.consensus_result === "REDDEDİLDİ" ? "❌ " : "⏳ "}
                    {decision.consensus_result || tr.boardConsensusWaiting}
                  </span>
                </div>
              </div>

              {/* Ajan oyları */}
              <div className={`grid grid-cols-3 gap-px bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-800`}>
                {votes.map((v) => (
                  <div key={v.agent} className={`p-3 ${getVoteColor(v.vote)}`}>
                    <div className={`flex items-center gap-1.5 mb-1.5 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
                      <span className="text-[10px] font-bold text-start">{getAgentLabel(v.agent)}</span>
                    </div>
                    <div className={`flex items-center gap-2 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
                      <span className={`text-[10px] font-black uppercase tracking-wider ${
                        v.vote === "ONAY" ? "text-emerald-700 dark:text-emerald-400" :
                        v.vote === "RED" ? "text-red-700 dark:text-red-400" :
                        "text-slate-400"
                      }`}>
                        {v.vote === "ONAY" ? `✓ ${tr.boardVoteApprove}` :
                         v.vote === "RED" ? `✕ ${tr.boardVoteReject}` :
                         tr.boardVoteWaiting}
                      </span>
                      {v.confidence !== null && (
                        <span className="text-[8px] font-mono text-slate-400">
                          {Math.round(v.confidence * 100)}%
                        </span>
                      )}
                    </div>
                    {v.reason && (
                      <p className="text-[9px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed text-start line-clamp-2">
                        {v.reason}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Mühür bilgisi */}
              {decision.seal_hash && (
                <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-900/10 border-t border-emerald-200 dark:border-emerald-800">
                  <div className={`flex items-center gap-2 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
                    <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400">
                      {getConsensusLabel(decision.consensus_result)}
                    </span>
                    <span className="text-[8px] font-mono text-emerald-500 dark:text-emerald-500/70">
                      {decision.seal_hash}
                    </span>
                  </div>
                </div>
              )}

              {/* Zaman bilgisi */}
              <div className={`px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-between ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
                <span className="text-[9px] text-slate-400">
                  {new Date(decision.created_at).toLocaleString(lang === "ar" ? "ar-SA" : "tr-TR")}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
