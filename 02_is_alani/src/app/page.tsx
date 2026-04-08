"use client";
import { useEffect, useState } from 'react';
import { fetchTasksFromDB, subscribeToTasks } from '@/services/taskService';
import { useTaskStore } from '@/store/useTaskStore';
import { useLanguageStore } from '@/store/useLanguageStore';
import { supabase } from '@/lib/supabase';
import { ERR, processError } from '@/lib/errorCore';
import { handleError } from '@/lib/errorHandler';
import { t } from '@/lib/i18n';
import TaskForm from '@/components/TaskForm';
import TaskCard from '@/components/TaskCard';
import TaskBoard from '@/components/TaskBoard';
import Stats from '@/components/Stats';
import AuditLog from '@/components/AuditLog';
import BoardPanel from '@/components/BoardPanel';
import { exportSystemData } from '@/services/exportService';
import { toast } from 'sonner';

export default function Dashboard() {
  const { tasks, error, setError } = useTaskStore();
  const { lang, dir } = useLanguageStore();
  const tr = t(lang);
  const [isLocked, setIsLocked] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    // ── FETCH: Görev listesini çek ──────────────────────────
    try {
      fetchTasksFromDB();
    } catch (error) {
      processError(ERR.TASK_FETCH, error, { kaynak: 'Dashboard.useEffect', islem: 'INIT_FETCH' });
      setError(`${ERR.TASK_FETCH}: Görev listesi yüklenemedi`);
    }

    // ── SUBSCRIBE: Realtime kanal aç ────────────────────────
    let channel: ReturnType<typeof subscribeToTasks> | null = null;
    try {
      channel = subscribeToTasks(() => {
        try {
          fetchTasksFromDB();
        } catch (error) {
          processError(ERR.TASK_FETCH, error, { kaynak: 'Dashboard.realtime_callback', islem: 'REALTIME_FETCH' });
        }
      });
    } catch (error) {
      processError(ERR.TASK_REALTIME, error, { kaynak: 'Dashboard.useEffect', islem: 'SUBSCRIBE' });
    }

    // ── CLEANUP: Kanal kapat ────────────────────────────────
    return () => {
      try {
        if (channel) {
          supabase.removeChannel(channel);
        }
      } catch (error) {
        processError(ERR.UNIDENTIFIED_COLLAPSE, error, { kaynak: 'Dashboard.cleanup', islem: 'REMOVE_CHANNEL' }, 'FATAL');
      }
    };
  }, [setError]);

  // ── EXPORT: Sistem mühürleme (loading + toast) ────────────
  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportSystemData();
      toast.success('Sistem başarıyla mühürlendi (JSON)');
    } catch (error) {
      await handleError(ERR.SYSTEM_EXPORT, error, { kaynak: 'Dashboard.handleExport', islem: 'EXPORT' });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-57px)]">
      {/* ── ANA İÇERİK — Scrollable ──────────────────────────── */}
      <main className="flex-1 p-8 max-w-7xl mx-auto w-full text-start">
        {/* ── ÜST: BAŞLIK + KONTROLLER ─────────────────────────── */}
        <div className={`flex justify-between items-center mb-8 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
          <h1 className="text-3xl font-black tracking-tighter">{tr.dashboardTitle}</h1>
          <div className={`flex items-center gap-4 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
            <button
              onClick={() => setIsLocked(!isLocked)}
              className={`text-[10px] font-bold px-3 py-1 rounded border transition-colors ${
                isLocked ? 'bg-red-600 text-white border-red-700' : 'bg-green-600 text-white border-green-700'
              }`}
            >
              {isLocked ? tr.accessLocked : tr.accessOpen}
            </button>
            {!isLocked && (
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 px-3 py-1 rounded border border-slate-300 dark:border-slate-700 transition-colors disabled:opacity-50"
              >
                {isExporting ? tr.sealing : tr.sealSystem}
              </button>
            )}
            <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">{tr.systemOnline}</div>
          </div>
        </div>

        {/* ── ÜST: STATS — Her zaman görünür ──────────────────── */}
        <Stats />

        {isLocked ? (
          <div className="flex flex-col items-center justify-center p-20 bg-slate-50 dark:bg-slate-900 border-2 border-dashed border-slate-200 rounded-3xl">
            <span className="text-4xl mb-4 text-start">🔒</span>
            <p className="text-slate-500 font-bold tracking-widest uppercase text-start">{tr.systemRestricted}</p>
            <p className="text-[10px] text-slate-400 mt-2 text-start">{tr.unlockHint}</p>
          </div>
        ) : (
          <>
            {error && (
              <div className={`mb-6 p-4 bg-red-50 border-s-4 border-red-500 text-red-700 flex justify-between items-center rounded shadow-sm ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                <div className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                  <span className="font-bold text-xs uppercase tracking-widest">{tr.systemError}</span>
                  <span className="text-sm font-mono">{error}</span>
                </div>
                <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 font-bold">×</button>
              </div>
            )}

            {/* ── ÖN: Görev giriş formu ───────────────────────────── */}
            <section className="mb-12">
              <h2 className="text-sm font-bold text-slate-500 mb-4 tracking-widest uppercase text-start">{tr.newOrder}</h2>
              <TaskForm />
            </section>

            {/* ── ÖN: KANBAN GÖREV PANOSU ─────────────────────────── */}
            <TaskBoard />

            {/* ── ÖN: Görev listesi (düz liste görünümü) ─────────── */}
            <section className="mb-12">
              <h2 className="text-sm font-bold text-slate-500 mb-4 tracking-widest uppercase text-start">{tr.taskSchedule}</h2>
              <div className="space-y-3">
                {tasks.length === 0 && <p className="text-slate-400 italic text-xs text-start">{tr.noActiveTasks}</p>}
                {tasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            </section>

            {/* ── ÖN: YÖNETİM KURULU — Konsensüs Mekanizması ──── */}
            <BoardPanel />
          </>
        )}
      </main>

      {/* ── ALT: AUDIT LOG — Sayfa altına SABİTLENMİŞ (sticky bottom) ── */}
      <footer className="sticky bottom-0 z-40 bg-white dark:bg-slate-950 border-t-2 border-slate-200 dark:border-slate-800 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="max-w-7xl mx-auto p-4">
          <AuditLog />
        </div>
      </footer>
    </div>
  );
}
