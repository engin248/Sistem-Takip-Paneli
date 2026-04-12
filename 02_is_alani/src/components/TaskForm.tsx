"use client";
import { useState, useEffect } from 'react';
import { fetchTasksFromDB } from '@/services/taskService';
import { toast } from 'sonner';
import { useLanguageStore } from '@/store/useLanguageStore';
import { useOperatorStore } from '@/store/useOperatorStore';
import { t } from '@/lib/i18n';
import type { TaskPriority } from '@/store/useTaskStore';

// ============================================================
// İŞ EMRİ FORMU — KARARGAH PANELI
// ============================================================
// İş Emri: EM-BRAVO-01
// Mimari: Client component → /api/tasks (server-side POST)
// Server-side modüller (agentRegistry, telegramNotifier,
// aiManager) burada import EDİLMEZ — API route üzerinden erişilir.
// ============================================================

// ── AJAN TİPİ (API'den gelen) ──────────────────────────────
interface AgentInfo {
  kod_adi: string;
  rol: string;
  katman: string;
  durum: string;
}

// ── AI ÖNERİ TİPİ (API'den gelen) ──────────────────────────
interface AISuggestion {
  priority: string;
  confidence: number;
  reasoning: string;
}

const PRIORITY_OPTIONS: { value: TaskPriority; label: string; emoji: string }[] = [
  { value: 'kritik', label: 'KRİTİK', emoji: '🔴' },
  { value: 'yuksek', label: 'YÜKSEK', emoji: '🟠' },
  { value: 'normal', label: 'NORMAL', emoji: '🟡' },
  { value: 'dusuk', label: 'DÜŞÜK', emoji: '🟢' },
];

export default function TaskForm() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('normal');
  const [assignedTo, setAssignedTo] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { lang, dir } = useLanguageStore();
  const { operator } = useOperatorStore();
  const tr = t(lang);

  // ── AJAN LİSTESİ — API ROUTE'DAN FETCH ────────────────────
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/tasks?action=agents')
      .then(r => r.json())
      .then(d => {
        if (d.success && Array.isArray(d.data)) {
          setAgents(d.data);
        }
      })
      .catch(() => {
        // API erişilemezse sessizce devam — serbest metin girişi kalır
      })
      .finally(() => setAgentsLoading(false));
  }, []);

  // ── AI ÖNCELİK ÖNERİSİ — DEBOUNCE İLE ───────────────────
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null);

  useEffect(() => {
    if (title.trim().length < 5) {
      setAiSuggestion(null);
      return;
    }

    const timer = setTimeout(() => {
      fetch(`/api/tasks?action=suggest&title=${encodeURIComponent(title.trim())}`)
        .then(r => r.json())
        .then(d => {
          if (d.success && d.data) {
            setAiSuggestion(d.data);
          }
        })
        .catch(() => {
          setAiSuggestion(null);
        });
    }, 600); // 600ms debounce

    return () => clearTimeout(timer);
  }, [title]);

  // ── SUBMIT HANDLER — API ROUTE POST ───────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const finalAssignedTo = assignedTo.trim() || operator.name || 'SISTEM';

      // Client-side hızlı kontrol
      if (title.trim().length < 3) {
        toast.error('Görev başlığı en az 3 karakter olmalı');
        setIsSubmitting(false);
        return;
      }

      // API Route'a POST — tüm server-side işlemler orada
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          priority,
          assigned_to: finalAssignedTo,
          due_date: dueDate || null,
          operator_name: operator.name,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        toast.error(result.error || 'İş emri oluşturulamadı');
        return;
      }

      // Başarılı
      const taskCode = result.data?.task_code || '';
      const telegramInfo = result.telegram?.sent ? ' 📩 Telegram gönderildi' : '';
      toast.success(`İş emri oluşturuldu: ${taskCode}${telegramInfo}`);

      // Form sıfırla
      setTitle('');
      setDescription('');
      setPriority('normal');
      setAssignedTo('');
      setDueDate('');
      setAiSuggestion(null);

      // Görev listesini güncelle (Realtime de tetikler ama anında görmek için)
      await fetchTasksFromDB();

    } catch (err) {
      toast.error('Bağlantı hatası — lütfen tekrar deneyin');
      console.error('[TaskForm] Submit hatası:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── AI ÖNERİ BADGE RENDER ────────────────────────────────
  const renderAISuggestion = () => {
    if (!aiSuggestion) return null;
    const priorityEmoji: Record<string, string> = {
      kritik: '🔴', yuksek: '🟠', normal: '🟡', dusuk: '🟢',
    };
    const emoji = priorityEmoji[aiSuggestion.priority] ?? '🟡';
    const pct = Math.round(aiSuggestion.confidence * 100);
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-cyan-500/20 animate-fade-in-up">
        <span className="text-[9px] font-bold text-cyan-400 tracking-wider">🤖 AI ÖNERİ</span>
        <span className="text-[10px] font-black text-white">
          {emoji} {aiSuggestion.priority.toUpperCase()}
        </span>
        <span className="text-[9px] font-mono text-slate-400">%{pct}</span>
        <button
          type="button"
          onClick={() => setPriority(aiSuggestion.priority as TaskPriority)}
          className="text-[8px] font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/30 transition-all"
        >
          UYGULA
        </button>
      </div>
    );
  };

  // ── Aktif ajan filtresi ───────────────────────────────────
  const activeAgents = agents.filter(a => a.durum === 'aktif');

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* ── Başlık ──────────────────────────────────────────── */}
      <input
        id="task-title-input"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full border border-slate-700 bg-slate-800/50 text-slate-100 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500/50 outline-none placeholder-slate-500 transition-all"
        placeholder={tr.placeholder || 'İş emri başlığı...'}
        disabled={isSubmitting}
        dir={dir}
      />

      {/* ── AI Öneri Badge ──────────────────────────────────── */}
      {renderAISuggestion()}

      {/* ── Açıklama ────────────────────────────────────────── */}
      <textarea
        id="task-description-input"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full border border-slate-700 bg-slate-800/50 text-slate-100 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500/50 outline-none resize-none h-16 placeholder-slate-500 transition-all"
        placeholder={lang === 'ar' ? 'وصف المهمة (اختياري)...' : 'Görev açıklaması (opsiyonel)...'}
        disabled={isSubmitting}
        dir={dir}
      />

      {/* ── Alt satır: Öncelik + Ajan + Son Tarih + Buton ─── */}
      <div className={`flex flex-wrap gap-2 items-end ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>

        {/* ── Öncelik ────────────────────────────────────────── */}
        <div className="flex flex-col gap-1">
          <label className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Öncelik</label>
          <select
            id="task-priority-select"
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority)}
            className="border border-slate-700 bg-slate-800/50 text-slate-200 p-2 rounded-lg text-xs outline-none focus:ring-1 focus:ring-cyan-500/50"
            disabled={isSubmitting}
          >
            {PRIORITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.emoji} {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* ── Ajan Seçici (API'den gelen) ────────────────────── */}
        <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
          <label className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">
            Atanan {activeAgents.length > 0 && <span className="text-cyan-400/60">({activeAgents.length} ajan)</span>}
          </label>
          {activeAgents.length > 0 ? (
            <select
              id="task-agent-select"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="border border-slate-700 bg-slate-800/50 text-slate-200 p-2 rounded-lg text-xs outline-none focus:ring-1 focus:ring-cyan-500/50"
              disabled={isSubmitting || agentsLoading}
            >
              <option value="">Seçiniz...</option>
              {activeAgents.map((a) => (
                <option key={a.kod_adi} value={a.kod_adi}>
                  {a.kod_adi} — {a.rol} [{a.katman}]
                </option>
              ))}
            </select>
          ) : (
            <input
              id="task-assigned-input"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="border border-slate-700 bg-slate-800/50 text-slate-200 p-2 rounded-lg text-xs outline-none focus:ring-1 focus:ring-cyan-500/50 placeholder-slate-500"
              placeholder={lang === 'ar' ? 'المسؤول...' : 'Atanan kişi...'}
              disabled={isSubmitting}
              dir={dir}
            />
          )}
        </div>

        {/* ── Son Tarih ──────────────────────────────────────── */}
        <div className="flex flex-col gap-1">
          <label className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Son Tarih</label>
          <input
            id="task-duedate-input"
            type="datetime-local"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="border border-slate-700 bg-slate-800/50 text-slate-200 p-2 rounded-lg text-xs outline-none focus:ring-1 focus:ring-cyan-500/50"
            disabled={isSubmitting}
          />
        </div>

        {/* ── Gönder Butonu ──────────────────────────────────── */}
        <button
          id="task-submit-btn"
          type="submit"
          className="bg-cyan-600 text-white text-xs font-black px-6 py-2.5 rounded-lg disabled:opacity-40 hover:bg-cyan-500 transition-all uppercase tracking-[0.15em] whitespace-nowrap neon-glow-cyan"
          disabled={isSubmitting || !title.trim()}
        >
          {isSubmitting ? '⏳ GÖNDERİLİYOR...' : (tr.addButton || 'İŞ EMRİ VER')}
        </button>
      </div>
    </form>
  );
}
