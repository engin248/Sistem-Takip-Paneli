"use client";
import { useState } from 'react';
import { supabase, validateSupabaseConnection } from '@/lib/supabase';
import { fetchTasksFromDB } from '@/services/taskService';
import { logAudit } from '@/services/auditService';
import { handleError } from '@/lib/errorHandler';
import { ERR, processError } from '@/lib/errorCore';
import { toast } from 'sonner';
import { useLanguageStore } from '@/store/useLanguageStore';
import { useOperatorStore } from '@/store/useOperatorStore';
import { t } from '@/lib/i18n';
import type { TaskPriority } from '@/store/useTaskStore';

// task_code üretici — TSK-YYYYMMDD-RAND formatında
function generateTaskCode(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TSK-${date}-${rand}`;
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { lang, dir } = useLanguageStore();
  const { operator } = useOperatorStore();
  const tr = t(lang);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    // Bağlantı ön kontrolü
    const { isValid } = validateSupabaseConnection();
    if (!isValid) {
      processError(ERR.CONNECTION_INVALID, new Error('Bağlantı bilgileri eksik'), {
        islem: 'TASK_CREATE'
      }, 'CRITICAL');
      return;
    }

    setIsSubmitting(true);

    try {
      const taskCode = generateTaskCode();
      const finalAssignedTo = assignedTo.trim() || operator.name || 'SISTEM';

      const { data, error } = await supabase
        .from('tasks')
        .insert([{
          title: title.trim(),
          description: description.trim() || null,
          task_code: taskCode,
          status: 'beklemede',
          priority,
          assigned_to: finalAssignedTo,
          assigned_by: operator.name || 'OPERATÖR',
          evidence_required: true,
          evidence_provided: false,
          retry_count: 0,
          is_archived: false,
        }])
        .select();

      if (error) {
        // ERR-STP001-010: Görev oluşturma Supabase hatası
        await handleError(ERR.TASK_CREATE, error, {
          tablo: 'tasks',
          islem: 'INSERT',
          task_code: taskCode
        });
        return;
      }

      await logAudit({
        operation_type: 'CREATE',
        action_description: `Yeni görev oluşturuldu: ${title} [${taskCode}] → ${priority.toUpperCase()} → ${finalAssignedTo}`,
        task_id: data?.[0]?.id ?? null,
        metadata: {
          action_code: 'TASK_CREATED',
          title,
          description: description.trim() || null,
          task_code: taskCode,
          priority,
          assigned_to: finalAssignedTo,
        }
      });

      setTitle('');
      setDescription('');
      setPriority('normal');
      setAssignedTo('');
      await fetchTasksFromDB();
      toast.success(`Görev oluşturuldu: ${taskCode}`);
    } catch (err) {
      // ERR-STP001-011: Görev oluşturma genel hatası
      await handleError(ERR.TASK_CREATE_GENERAL, err, {
        tablo: 'tasks',
        islem: 'INSERT'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-8 space-y-3">
      {/* Başlık */}
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        placeholder={tr.placeholder}
        disabled={isSubmitting}
        dir={dir}
      />

      {/* Açıklama */}
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none h-16"
        placeholder={lang === 'ar' ? 'وصف المهمة (اختياري)...' : 'Görev açıklaması (opsiyonel)...'}
        disabled={isSubmitting}
        dir={dir}
      />

      {/* Alt satır: Öncelik + Atanan + Buton */}
      <div className={`flex gap-2 items-end ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
        {/* Öncelik */}
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as TaskPriority)}
          className="border border-slate-200 dark:border-slate-700 dark:bg-slate-800 p-2 rounded-lg text-xs outline-none"
          disabled={isSubmitting}
        >
          {PRIORITY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.emoji} {opt.label}
            </option>
          ))}
        </select>

        {/* Atanan kişi */}
        <input
          value={assignedTo}
          onChange={(e) => setAssignedTo(e.target.value)}
          className="flex-1 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 p-2 rounded-lg text-xs outline-none"
          placeholder={lang === 'ar' ? 'المسؤول...' : 'Atanan kişi...'}
          disabled={isSubmitting}
          dir={dir}
        />

        {/* Gönder */}
        <button
          type="submit"
          className="bg-blue-600 text-white text-xs font-bold px-6 py-2.5 rounded-lg disabled:opacity-50 hover:bg-blue-700 transition-all uppercase tracking-wider whitespace-nowrap"
          disabled={isSubmitting || !title.trim()}
        >
          {isSubmitting ? '...' : tr.addButton}
        </button>
      </div>
    </form>
  );
}
