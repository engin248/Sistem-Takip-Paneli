"use client";
import { useEffect } from 'react';
import { fetchTasksFromDB } from '@/services/taskService';
import { useTaskStore } from '@/store/useTaskStore';
import TaskForm from '@/components/TaskForm';

export default function Dashboard() {
  const { tasks } = useTaskStore();

  useEffect(() => {
    fetchTasksFromDB();
  }, []);

  return (
    <main className="p-8 max-w-4xl mx-auto text-start">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-black tracking-tighter">STP-OPERASYON MERKEZİ</h1>
        <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">SİSTEM ÇEVRİMİÇİ</div>
      </div>

      {/* GÖREV EKLEME BİRİMİ */}
      <section className="mb-12">
        <h2 className="text-sm font-bold text-slate-500 mb-4 tracking-widest">YENİ EMİR GİRİŞİ</h2>
        <TaskForm />
      </section>

      {/* AKTİF GÖREV LİSTESİ */}
      <section>
        <h2 className="text-sm font-bold text-slate-500 mb-4 tracking-widest">GÖREV ÇİZELGESİ</h2>
        <div className="space-y-3">
          {tasks.length === 0 && <p className="text-slate-400 italic">Şu an aktif emir bulunmamaktadır.</p>}
          {tasks.map((task) => (
            <div key={task.id} className="group flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg hover:border-blue-500 transition-all shadow-sm">
              <div className="flex flex-col">
                <span className="font-semibold text-slate-800">{task.title}</span>
                <span className="text-[10px] text-slate-400 uppercase tracking-tighter">{new Date(task.created_at).toLocaleString('tr-TR')}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${
                  task.status === 'beklemede' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {task.status.toUpperCase()}
                </span>
                <button className="text-slate-300 group-hover:text-red-500 transition-colors">✕</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
