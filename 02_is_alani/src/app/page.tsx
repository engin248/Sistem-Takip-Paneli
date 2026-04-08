"use client";
import { useEffect } from 'react';
import { fetchTasksFromDB, updateStatus, deleteTask } from '@/services/taskService';
import { useTaskStore } from '@/store/useTaskStore';
import TaskForm from '@/components/TaskForm';
import TaskCard from '@/components/TaskCard';

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
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      </section>
    </main>
  );
}
