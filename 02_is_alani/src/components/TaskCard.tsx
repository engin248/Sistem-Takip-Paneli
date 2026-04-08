"use client";
import { useState } from 'react';
import { Task } from '@/store/useTaskStore';
import { updateStatus, deleteTask, archiveTask } from '@/services/taskService';
import { toast } from 'sonner';
import { useLanguageStore } from '@/store/useLanguageStore';
import { t } from '@/lib/i18n';

export default function TaskCard({ task }: { task: Task }) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const { lang, dir } = useLanguageStore();
  const tr = t(lang);

  const handleStatusChange = async (newStatus: string) => {
    setIsUpdating(true);
    try {
      await updateStatus(task.id, newStatus);
      toast.success(`Durum güncellendi: ${newStatus.toUpperCase()}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(tr.confirmDelete)) return;
    setIsDeleting(true);
    try {
      await deleteTask(task.id);
      toast.success('Görev silindi');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleArchive = async () => {
    if (!confirm(tr.confirmArchive)) return;
    setIsArchiving(true);
    try {
      await archiveTask(task.id);
      toast.success('Görev arşivlendi');
    } finally {
      setIsArchiving(false);
    }
  };

  const isAnyLoading = isUpdating || isDeleting || isArchiving;

  return (
    <div className={`flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm hover:shadow-md transition-all ${isAnyLoading ? 'opacity-60 pointer-events-none' : ''} ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
      <div className="flex flex-col gap-1">
        <h3 className="font-bold text-slate-800 dark:text-slate-100">{task.title}</h3>
        <span className="text-[10px] font-mono text-slate-400 italic">{task.id.slice(0, 8)}</span>
      </div>
      
      <div className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
        <select 
          value={task.status} 
          onChange={(e) => handleStatusChange(e.target.value)}
          disabled={isAnyLoading}
          className="text-xs bg-slate-50 dark:bg-slate-800 border-none rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500 text-start disabled:opacity-50"
        >
          <option value="beklemede">{tr.statusPending}</option>
          <option value="devam_ediyor">{tr.statusInProgress}</option>
          <option value="dogrulama">{tr.statusVerification}</option>
          <option value="tamamlandi">{tr.statusCompleted}</option>
          <option value="reddedildi">{tr.statusRejected}</option>
          <option value="iptal">{tr.statusCancelled}</option>
        </select>

        {task.status === 'tamamlandi' && (
          <button 
            onClick={handleArchive}
            disabled={isAnyLoading}
            className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-blue-500 rounded-lg transition-colors border border-blue-100 dark:border-blue-900/30 disabled:opacity-50"
            title="Arşivle"
          >
            {isArchiving ? '⏳' : '📥'}
          </button>
        )}

        <button 
          onClick={handleDelete}
          disabled={isAnyLoading}
          className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-300 hover:text-red-500 rounded-lg transition-colors disabled:opacity-50"
          title="Sil"
        >
          {isDeleting ? '⏳' : '✕'}
        </button>
      </div>
    </div>
  );
}
