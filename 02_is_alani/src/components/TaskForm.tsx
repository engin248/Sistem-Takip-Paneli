"use client";
import { useState } from 'react';
import { supabase, validateSupabaseConnection } from '@/lib/supabase';
import { fetchTasksFromDB } from '@/services/taskService';
import { logAudit } from '@/services/auditService';
import { handleError } from '@/lib/errorHandler';
import { ERR, processError } from '@/lib/errorCore';
import { toast } from 'sonner';
import { useLanguageStore } from '@/store/useLanguageStore';
import { t } from '@/lib/i18n';

// task_code üretici — TSK-YYYYMMDD-RAND formatında
function generateTaskCode(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TSK-${date}-${rand}`;
}

export default function TaskForm() {
  const [title, setTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { lang, dir } = useLanguageStore();
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

      const { data, error } = await supabase
        .from('tasks')
        .insert([{
          title: title.trim(),
          task_code: taskCode,
          status: 'beklemede',
          priority: 'normal',
          assigned_to: 'SISTEM',
          assigned_by: 'OPERATÖR',
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
        action_description: `Yeni görev oluşturuldu: ${title} [${taskCode}]`,
        task_id: data?.[0]?.id ?? null,
        metadata: { action_code: 'TASK_CREATED', title, task_code: taskCode }
      });

      setTitle('');
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
    <form onSubmit={handleSubmit} className={`mb-8 flex gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="border p-2 rounded w-full dark:bg-slate-800"
        placeholder={tr.placeholder}
        disabled={isSubmitting}
        dir={dir}
      />
      <button
        type="submit"
        className="bg-blue-600 text-white px-6 py-2 rounded disabled:opacity-50"
        disabled={isSubmitting}
      >
        {isSubmitting ? '...' : tr.addButton}
      </button>
    </form>
  );
}
