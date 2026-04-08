"use client";
import { useEffect } from 'react';
import { fetchTasksFromDB } from '@/services/taskService';
import { useTaskStore } from '@/store/useTaskStore';

export default function Dashboard() {
  const { tasks } = useTaskStore();

  useEffect(() => {
    fetchTasksFromDB(); // Veriyi çek ve store'a mühürle
  }, []);

  return (
    <main className="p-8 font-sans text-start">
      <h1 className="text-2xl font-bold mb-6">SİSTEM TAKİP PANELİ (STP-001)</h1>
      <div className="grid gap-4">
        {tasks.map((task) => (
          <div key={task.id} className="p-4 border rounded shadow-sm flex justify-between">
            <span>{task.title}</span>
            <span className="font-mono text-blue-600">[{task.status}]</span>
          </div>
        ))}
      </div>
    </main>
  );
}
