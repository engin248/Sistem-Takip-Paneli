"use client";
import { useState } from 'react';
import { Task } from '@/store/useTaskStore';
import { updateStatus, deleteTask, archiveTask } from '@/services/taskService';
import { handleError } from '@/lib/errorHandler';
import { ERR } from '@/lib/errorCore';
import { checkWritePermission } from '@/lib/permissionGuard';
import { toast } from 'sonner';
import { useLanguageStore } from '@/store/useLanguageStore';
import { useOperatorStore } from '@/store/useOperatorStore';
import { t } from '@/lib/i18n';

export default function TaskCard({ task }: { task: Task }) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [auditorApproved, setAuditorApproved] = useState(false);
  const { lang, dir } = useLanguageStore();
  const { operator } = useOperatorStore();
  const tr = t(lang);

  // ── FILE-LEVEL LOCK: UI seviyesinde yetki kontrolü ─────────
  const permission = checkWritePermission(task.id, task.assigned_to, 'UI_RENDER');
  const isLocked = !permission.granted;
  const isOwner = operator.name.toUpperCase() === task.assigned_to.toUpperCase();

  // ── DENETÇİ ONAYI — dogrulama → tamamlandi geçiş kapısı ──
  const handleAuditorApproval = async () => {
    if (isLocked || task.status !== 'dogrulama') return;
    setAuditorApproved(true);
    toast.success(tr.auditorApprovedToast || 'Denetçi onayı verildi', {
      description: tr.auditorApproveDesc || 'Görev artık tamamlandı olarak işaretlenebilir.',
      duration: 4000,
    });
  };

  const handleStatusChange = async (newStatus: string) => {
    if (isLocked) {
      toast.error(tr.permDeniedToast, {
        description: tr.permNoAccess,
        duration: 5000,
      });
      return;
    }

    // ── DENETÇİ KAPISI: tamamlandi için dogrulama + onay zorunlu ──
    if (newStatus === 'tamamlandi') {
      if (task.status !== 'dogrulama') {
        toast.error(tr.auditorGateBlockTitle || 'GEÇİŞ ENGELLENDİ', {
          description: tr.auditorGateBlockDesc || 'Görev önce "Doğrulama" aşamasından geçmelidir.',
          duration: 6000,
        });
        return;
      }
      if (!auditorApproved) {
        toast.error(tr.auditorGateBlockTitle || 'GEÇİŞ ENGELLENDİ', {
          description: tr.auditorCheckboxRequired || 'Denetçi onay kutusunu işaretleyin.',
          duration: 6000,
        });
        return;
      }
    }

    setIsUpdating(true);
    try {
      await updateStatus(task.id, newStatus);
      if (newStatus === 'tamamlandi') setAuditorApproved(false);
      toast.success(`Durum güncellendi: ${newStatus.toUpperCase()}`);
    } catch (err) {
      await handleError(ERR.TASK_UPDATE, err, {
        kaynak: 'TaskCard.handleStatusChange',
        islem: 'UPDATE',
        task_id: task.id,
        attempted_status: newStatus
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (isLocked) {
      toast.error(tr.permDeniedToast, {
        description: tr.permNoAccess,
        duration: 5000,
      });
      return;
    }
    if (!confirm(tr.confirmDelete)) return;
    setIsDeleting(true);
    try {
      await deleteTask(task.id);
      toast.success('Görev silindi');
    } catch (err) {
      await handleError(ERR.TASK_DELETE, err, {
        kaynak: 'TaskCard.handleDelete',
        islem: 'DELETE',
        task_id: task.id
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleArchive = async () => {
    if (isLocked) {
      toast.error(tr.permDeniedToast, {
        description: tr.permNoAccess,
        duration: 5000,
      });
      return;
    }
    if (!confirm(tr.confirmArchive)) return;
    setIsArchiving(true);
    try {
      await archiveTask(task.id);
      toast.success('Görev arşivlendi');
    } catch (err) {
      await handleError(ERR.TASK_ARCHIVE, err, {
        kaynak: 'TaskCard.handleArchive',
        islem: 'ARCHIVE',
        task_id: task.id
      });
    } finally {
      setIsArchiving(false);
    }
  };

  const isAnyLoading = isUpdating || isDeleting || isArchiving;
  const isDisabled = isAnyLoading || isLocked;

  return (
    <div className={`relative flex items-center justify-between p-4 bg-white dark:bg-slate-900 border rounded-xl shadow-sm hover:shadow-md transition-all ${
      isLocked
        ? 'border-amber-300 dark:border-amber-700 opacity-75'
        : 'border-slate-200 dark:border-slate-800'
    } ${isAnyLoading ? 'opacity-60 pointer-events-none' : ''} ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>

      {/* ── KİLİT ROZETI — sol üst köşe ───────────────────────── */}
      {isLocked && (
        <div className={`absolute -top-2 ${dir === 'rtl' ? '-right-2' : '-left-2'} z-10`}>
          <span className="inline-flex items-center gap-1 bg-amber-500 text-white text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-md">
            🔒 {tr.permReadOnly}
          </span>
        </div>
      )}

      {/* ── GÖREV BİLGİLERİ ───────────────────────────────────── */}
      <div className="flex flex-col gap-1">
        <h3 className="font-bold text-slate-800 dark:text-slate-100">{task.title}</h3>
        <div className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
          <span className="text-[10px] font-mono text-slate-400 italic">{task.id.slice(0, 8)}</span>
          {/* ── SAHİPLİK ETİKETİ ─────────────────────────────── */}
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
            isOwner
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
          }`}>
            {tr.permLockedBy} {task.assigned_to}
            {isOwner && <span className="ms-1 text-green-600">{tr.permYou}</span>}
          </span>
        </div>
      </div>
      
      {/* ── KONTROLLER ────────────────────────────────────────── */}
      <div className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>

        {/* ── KİLİTLİYSE: Uyarı göster ───────────────────────── */}
        {isLocked && (
          <span className="text-[9px] text-amber-600 dark:text-amber-400 font-bold max-w-[120px] text-end leading-tight">
            {tr.permLockWarning}
          </span>
        )}

        {/* ── DENETÇİ ONAYI CHECKBOX — dogrulama statüsünde görünür ── */}
        {task.status === 'dogrulama' && !isLocked && (
          <label
            className={`flex items-center gap-1.5 cursor-pointer select-none group ${
              dir === 'rtl' ? 'flex-row-reverse' : ''
            }`}
            title={tr.auditorCheckboxLabel || 'Denetçi Onayı'}
          >
            <input
              id={`auditor-${task.id}`}
              type="checkbox"
              checked={auditorApproved}
              onChange={handleAuditorApproval}
              className="w-3.5 h-3.5 accent-emerald-600 cursor-pointer rounded"
            />
            <span className={`text-[9px] font-bold uppercase tracking-wider transition-colors ${
              auditorApproved
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'
            }`}>
              {auditorApproved
                ? (tr.auditorApproved || '✅ ONAYLANDI')
                : (tr.auditorCheckboxLabel || '🔍 DENETÇİ ONAYI')}
            </span>
          </label>
        )}

        <select 
          value={task.status} 
          onChange={(e) => handleStatusChange(e.target.value)}
          disabled={isDisabled}
          className={`text-xs bg-slate-50 dark:bg-slate-800 border-none rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500 text-start disabled:opacity-50 ${
            isLocked ? 'cursor-not-allowed' : ''
          }`}
        >
          <option value="beklemede">{tr.statusPending}</option>
          <option value="devam_ediyor">{tr.statusInProgress}</option>
          <option value="dogrulama">{tr.statusVerification}</option>
          <option value="tamamlandi" disabled={task.status === 'dogrulama' && !auditorApproved}>{tr.statusCompleted}</option>
          <option value="reddedildi">{tr.statusRejected}</option>
          <option value="iptal">{tr.statusCancelled}</option>
        </select>

        {task.status === 'tamamlandi' && (
          <button 
            onClick={handleArchive}
            disabled={isDisabled}
            className={`p-2 rounded-lg transition-colors border disabled:opacity-50 ${
              isLocked
                ? 'text-slate-300 border-slate-200 cursor-not-allowed'
                : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-blue-500 border-blue-100 dark:border-blue-900/30'
            }`}
            title={isLocked ? tr.permNoAccess : 'Arşivle'}
          >
            {isArchiving ? '⏳' : '📥'}
          </button>
        )}

        <button 
          onClick={handleDelete}
          disabled={isDisabled}
          className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
            isLocked
              ? 'text-slate-200 cursor-not-allowed'
              : 'hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-300 hover:text-red-500'
          }`}
          title={isLocked ? tr.permNoAccess : 'Sil'}
        >
          {isDeleting ? '⏳' : '✕'}
        </button>
      </div>
    </div>
  );
}
