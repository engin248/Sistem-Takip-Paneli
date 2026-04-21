"use client";
import { useState, useEffect, useRef, useCallback } from 'react';
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

  // ── SESLİ GİRİŞ — Web Speech API ──────────────────────────
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setVoiceSupported(true);
      const recognition = new SpeechRecognition();
      recognition.lang = lang === 'ar' ? 'ar-SA' : 'tr-TR';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: any) => {
        const transcript = event.results[0]?.[0]?.transcript ?? '';
        if (transcript.trim()) {
          setTitle((prev) => prev ? `${prev} ${transcript.trim()}` : transcript.trim());
          toast.success(`🎤 Ses algılandı: "${transcript.trim().substring(0, 60)}"`);
        }
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        if (event.error !== 'aborted') {
          toast.error(`🎤 Ses hatası: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [lang]);

  const toggleVoice = useCallback(() => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.abort();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch {
        toast.error('Mikrofon erişimi sağlanamadı');
      }
    }
  }, [isListening]);

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

  // ── OTOMATİK AJAN ÖNERİSİ — DEBOUNCE İLE ─────────────────
  const [recommendedAgent, setRecommendedAgent] = useState<string | null>(null);
  const [agentManuallySet, setAgentManuallySet] = useState(false);

  useEffect(() => {
    if (title.trim().length < 5 || agentManuallySet) {
      return;
    }

    const timer = setTimeout(() => {
      fetch(`/api/tasks?action=auto-assign&title=${encodeURIComponent(title.trim())}`)
        .then(r => r.json())
        .then(d => {
          if (d.success && d.data?.recommended_agent) {
            setRecommendedAgent(d.data.recommended_agent);
            // Otomatik seç (kullanıcı henüz manuel seçim yapmadıysa)
            if (!agentManuallySet && !assignedTo) {
              setAssignedTo(d.data.recommended_agent);
            }
          }
        })
        .catch(() => {
          setRecommendedAgent(null);
        });
    }, 800); // 800ms debounce

    return () => clearTimeout(timer);
  }, [title, agentManuallySet, assignedTo]);

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

      // API Security: Fetch current session and pass the token
      const { supabase } = await import('@/lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // API Route'a POST — tüm server-side işlemler orada
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers,
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
      {/* ── Başlık + Mikrofon ──────────────────────────────── */}
      <div className="flex gap-2 items-center">
        <input
          id="task-title-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-1 border border-slate-700 bg-slate-800/50 text-slate-100 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500/50 outline-none placeholder-slate-500 transition-all"
          placeholder={isListening ? '🎤 Dinleniyor...' : (tr.placeholder || 'İş emri başlığı...')}
          disabled={isSubmitting || isListening}
          dir={dir}
        />
        {voiceSupported && (
          <button
            id="voice-input-btn"
            type="button"
            onClick={toggleVoice}
            disabled={isSubmitting}
            className={`
              w-10 h-10 flex items-center justify-center rounded-lg border transition-all duration-300 text-lg
              ${isListening
                ? 'bg-red-500/20 border-red-500/50 text-red-400 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.4)]'
                : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/50 hover:bg-cyan-500/10'
              }
            `}
            title={isListening ? 'Kaydı durdur' : 'Sesli komut ver'}
          >
            {isListening ? '⏹️' : '🎤'}
          </button>
        )}
      </div>
      {isListening && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 animate-pulse">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
          <span className="text-[10px] font-bold text-red-400 tracking-wider uppercase">SESLİ GİRİŞ AKTİF — Konuşun...</span>
        </div>
      )}

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
            {recommendedAgent && !agentManuallySet && (
              <span className="ml-1 text-emerald-400/80 text-[7px]">✦ AI önerisi: {recommendedAgent}</span>
            )}
          </label>
          {activeAgents.length > 0 ? (
            <select
              id="task-agent-select"
              value={assignedTo}
              onChange={(e) => { setAssignedTo(e.target.value); setAgentManuallySet(true); }}
              className="border border-slate-700 bg-slate-800/50 text-slate-200 p-2 rounded-lg text-xs outline-none focus:ring-1 focus:ring-cyan-500/50"
              disabled={isSubmitting || agentsLoading}
            >
              <option value="">Seçiniz...</option>
              {activeAgents.map((a) => (
                <option key={a.kod_adi} value={a.kod_adi}>
                  {a.kod_adi === recommendedAgent ? '✦ ' : ''}{a.kod_adi} — {a.rol} [{a.katman}]
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
