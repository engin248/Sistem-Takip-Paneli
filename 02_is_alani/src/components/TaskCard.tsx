"use client";
import { Task, useTaskStore } from '@/store/useTaskStore';
import { updateStatus, deleteTask } from '@/services/taskService';

export default function TaskCard({ task }: { task: Task }) {
  return (
    <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm hover:shadow-md transition-all">
      <div className="flex flex-col gap-1">
        <h3 className="font-bold text-slate-800 dark:text-slate-100">{task.title}</h3>
        <span className="text-[10px] font-mono text-slate-400 italic">{task.id.slice(0, 8)}</span>
      </div>
      
      <div className="flex items-center gap-2">
        <select 
          value={task.status} 
          onChange={(e) => updateStatus(task.id, e.target.value)}
          className="text-xs bg-slate-50 dark:bg-slate-800 border-none rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500 text-start"
        >
          <option value="beklemede">BEKLEMEDE</option>
          <option value="devam_ediyor">DEVAM EDİYOR</option>
          <option value="dogrulama">DOĞRULAMA</option>
          <option value="tamamlandi">TAMAMLANDI</option>
          <option value="reddedildi">REDDEDİLDİ</option>
          <option value="iptal">İPTAL</option>
        </select>

        <button 
          onClick={() => confirm('SİLİNSİN Mİ?') && deleteTask(task.id)}
          className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-300 hover:text-red-500 rounded-lg transition-colors"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
