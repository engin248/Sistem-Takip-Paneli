"use client";
import { useEffect, useState } from 'react';
import { fetchTasksFromDB, subscribeToTasks } from '@/services/taskService';
import { useTaskStore } from '@/store/useTaskStore';
import { supabase } from '@/lib/supabase';
import { fetchAuditLogs } from '@/services/auditService';
import TaskForm from '@/components/TaskForm';
import TaskCard from '@/components/TaskCard';
import Stats from '@/components/Stats';
import { exportSystemData } from '@/services/exportService';

export default function Dashboard() {
  const { tasks, error, setError } = useTaskStore();
  const [logs, setLogs] = useState<any[]>([]);
  const [isLocked, setIsLocked] = useState(true);

  const loadLogs = async () => {
    const data = await fetchAuditLogs();
    setLogs(data);
  };

  useEffect(() => {
    fetchTasksFromDB();
    loadLogs();
    
    const channel = subscribeToTasks(() => {
      fetchTasksFromDB();
      loadLogs();
    });
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <main className="p-8 max-w-4xl mx-auto text-start">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-black tracking-tighter">STP-OPERASYON MERKEZİ</h1>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsLocked(!isLocked)}
            className={`text-[10px] font-bold px-3 py-1 rounded border transition-colors ${
              isLocked ? 'bg-red-600 text-white border-red-700' : 'bg-green-600 text-white border-green-700'
            }`}
          >
            {isLocked ? 'ERİŞİM KİLİTLİ (AÇ)' : 'ERİŞİM AÇIK (KİLİTLE)'}
          </button>
          {!isLocked && (
            <button 
              onClick={exportSystemData}
              className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 px-3 py-1 rounded border border-slate-300 dark:border-slate-700 transition-colors"
            >
              SİSTEMİ MÜHÜRLE (JSON)
            </button>
          )}
          <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">SİSTEM ÇEVRİMİÇİ</div>
        </div>
      </div>

      {isLocked ? (
        <div className="flex flex-col items-center justify-center p-20 bg-slate-50 dark:bg-slate-900 border-2 border-dashed border-slate-200 rounded-3xl">
          <span className="text-4xl mb-4 text-start">🔒</span>
          <p className="text-slate-500 font-bold tracking-widest uppercase text-start">Sistem Erişimi Kısıtlandı</p>
          <p className="text-[10px] text-slate-400 mt-2 text-start">Lütfen yukarıdaki butonu kullanarak kilidi açın.</p>
        </div>
      ) : (
        <>
          <Stats />

          {error && (
            <div className="mb-6 p-4 bg-red-50 border-s-4 border-red-500 text-red-700 flex justify-between items-center rounded shadow-sm">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs uppercase tracking-widest">Sistem Hatası:</span>
                <span className="text-sm font-mono">{error}</span>
              </div>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 font-bold">×</button>
            </div>
          )}

          <section className="mb-12">
            <h2 className="text-sm font-bold text-slate-500 mb-4 tracking-widest uppercase text-start">Yeni Emir Girişi</h2>
            <TaskForm />
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <section>
              <h2 className="text-sm font-bold text-slate-500 mb-4 tracking-widest uppercase text-start">Görev Çizelgesi</h2>
              <div className="space-y-3">
                {tasks.length === 0 && <p className="text-slate-400 italic text-xs text-start">Aktif emir bulunmamaktadır.</p>}
                {tasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            </section>

            <section>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-sm font-bold text-slate-500 tracking-widest uppercase text-start">Denetim Günlüğü</h2>
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
        </>
      )}
    </main>
  );
}
