"use client";
import { useEffect } from 'react';
import { fetchTasksFromDB, updateStatus, deleteTask, subscribeToTasks } from '@/services/taskService';
import { useTaskStore } from '@/store/useTaskStore';
import { supabase } from '@/lib/supabase';
import { useState } from 'react';
import { fetchAuditLogs } from '@/services/auditService';
import TaskForm from '@/components/TaskForm';
import TaskCard from '@/components/TaskCard';
import Stats from '@/components/Stats';

export default function Dashboard() {
  const { tasks, error, setError } = useTaskStore();
  const [logs, setLogs] = useState<any[]>([]);

  const loadLogs = async () => {
    const data = await fetchAuditLogs();
    setLogs(data);
  };


  useEffect(() => {
    fetchTasksFromDB();
    loadLogs();
    
    // REALTIME SUBSCRIPTION
    const channel = subscribeToTasks(() => {
      fetchTasksFromDB();
      loadLogs(); // Logları da yenileyelim ki realtime hissi artsın
    });
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);


  return (
    <main className="p-8 max-w-4xl mx-auto text-start">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-black tracking-tighter">STP-OPERASYON MERKEZİ</h1>
        <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">SİSTEM ÇEVRİMİÇİ</div>
      </div>

      <Stats />

      {/* HATA BİLDİRİM PANELİ (ERR-CONTROL) */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border-s-4 border-red-500 text-red-700 flex justify-between items-center rounded shadow-sm">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs uppercase tracking-widest">Sistem Hatası:</span>
            <span className="text-sm font-mono">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 font-bold">×</button>
        </div>
      )}

      {/* GÖREV EKLEME BİRİMİ */}
      <section className="mb-12">
        <h2 className="text-sm font-bold text-slate-500 mb-4 tracking-widest uppercase">Yeni Emir Girişi</h2>
        <TaskForm />
      </section>

      {/* İKİLİ KOLON: GÖREVLER VE DENETİM */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* AKTİF GÖREV LİSTESİ */}
        <section>
          <h2 className="text-sm font-bold text-slate-500 mb-4 tracking-widest uppercase">Görev Çizelgesi</h2>
          <div className="space-y-3">
            {tasks.length === 0 && <p className="text-slate-400 italic text-xs">Aktif emir bulunmamaktadır.</p>}
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </section>

        {/* DENETİM GÜNLÜĞÜ (AUDIT) */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-bold text-slate-500 tracking-widest uppercase">Denetim Günlüğü</h2>
            <button onClick={loadLogs} className="text-[10px] text-blue-500 hover:underline">YENİLE</button>
          </div>
          <div className="space-y-2">
            {logs.map((log) => (
              <div key={log.id} className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-start">
                <div className="flex justify-between mb-1">
                  <span className="text-[10px] font-bold text-blue-600 font-mono">
                    {log.metadata?.action_code || log.operation_type}
                  </span>
                  <span className="text-[9px] text-slate-400">
                    {new Date(log.created_at).toLocaleTimeString('tr-TR')}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-tight">
                  {log.action_description}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
