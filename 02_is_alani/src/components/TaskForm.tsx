"use client";
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { fetchTasksFromDB } from '@/services/taskService';
import { logAudit } from '@/services/auditService';

export default function TaskForm() {
  const [title, setTitle] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    const { data, error } = await supabase
      .from('tasks')
      .insert([{ title, status: 'beklemede' }])
      .select();

    if (!error) {
      await logAudit({
        operation_type: 'CREATE',
        action_description: `Yeni görev oluşturuldu: ${title}`,
        metadata: { title }
      }); // İşlem mühürlendi
      setTitle('');
      await fetchTasksFromDB(); // Listeyi güncelle
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-8 flex gap-2">
      <input 
        value={title} 
        onChange={(e) => setTitle(e.target.value)}
        className="border p-2 rounded w-full dark:bg-slate-800"
        placeholder="Yeni Görev Emri..."
      />
      <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded">EKLE</button>
    </form>
  );
}
