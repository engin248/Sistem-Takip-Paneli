"use client";
import { useState, useCallback } from 'react';
import { useTaskStore, type Task, type TaskPriority, type TaskStatus } from '@/store/useTaskStore';
import { useLanguageStore } from '@/store/useLanguageStore';
import { toast } from 'sonner';

// ============================================================
// GÖREV DETAY MODAL — Düzenleme + Geçmiş Görüntüleme
// ============================================================
// Görev kartına tıklanınca açılır.
// Yetenekler:
//   - Başlık, açıklama, öncelik, ajan, son tarih düzenleme
//   - PUT /api/tasks ile kaydetme
//   - Audit log + Telegram bildirimi (API tarafında)
//   - ESC ile kapatma
// ============================================================

interface TaskDetailModalProps {
  task: Task;
  onClose: () => void;
}

const PRIORITY_OPTIONS: { value: TaskPriority; label: string; emoji: string }[] = [
  { value: 'kritik', label: 'KRİTİK', emoji: '🔴' },
  { value: 'yuksek', label: 'YÜKSEK', emoji: '🟠' },
  { value: 'normal', label: 'NORMAL', emoji: '🟡' },
  { value: 'dusuk', label: 'DÜŞÜK', emoji: '🟢' },
];

const STATUS_OPTIONS: { value: TaskStatus; label: string; emoji: string }[] = [
  { value: 'beklemede', label: 'Beklemede', emoji: '⏳' },
  { value: 'devam_ediyor', label: 'Devam Ediyor', emoji: '⚡' },
  { value: 'dogrulama', label: 'Doğrulama', emoji: '🔍' },
  { value: 'tamamlandi', label: 'Tamamlandı', emoji: '✅' },
  { value: 'reddedildi', label: 'Reddedildi', emoji: '❌' },
  { value: 'iptal', label: 'İptal', emoji: '🚫' },
];

export default function TaskDetailModal({ task, onClose }: TaskDetailModalProps) {
  const { updateTask } = useTaskStore();
  const { dir } = useLanguageStore();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Düzenleme state'leri
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDescription, setEditDescription] = useState(task.description ?? '');
  const [editPriority, setEditPriority] = useState<TaskPriority>(task.priority);
  const [editAssignedTo, setEditAssignedTo] = useState(task.assigned_to);
  const [editStatus, setEditStatus] = useState<TaskStatus>(task.status);
  const [editDueDate, setEditDueDate] = useState(task.due_date?.slice(0, 10) ?? '');

  // ── KAYDET ────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const updates: Record<string, unknown> = {};
      if (editTitle !== task.title) updates.title = editTitle;
      if (editDescription !== (task.description ?? '')) updates.description = editDescription || null;
      if (editPriority !== task.priority) updates.priority = editPriority;
      if (editAssignedTo !== task.assigned_to) updates.assigned_to = editAssignedTo;
      if (editStatus !== task.status) updates.status = editStatus;
      if (editDueDate !== (task.due_date?.slice(0, 10) ?? '')) {
        updates.due_date = editDueDate ? new Date(editDueDate).toISOString() : null;
      }

      if (Object.keys(updates).length === 0) {
        toast.info('Değişiklik yapılmadı');
        setIsEditing(false);
        return;
      }

      const res = await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: task.id, ...updates }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || 'Güncelleme başarısız');
        return;
      }

      // Optimistic update
      updateTask(task.id, updates as Partial<Task>);
      toast.success(`Görev güncellendi (${data.changed_fields})`);
      setIsEditing(false);
    } catch {
      toast.error('Görev güncellenirken hata oluştu');
    } finally {
      setIsSaving(false);
    }
  }, [task, editTitle, editDescription, editPriority, editAssignedTo, editStatus, editDueDate, updateTask]);

  // ── ESC KAPATMA ───────────────────────────────────────────
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  const priorityStyle = PRIORITY_OPTIONS.find(p => p.value === task.priority);
  const createdAt = new Date(task.created_at).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });
  const updatedAt = new Date(task.updated_at).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });

  return (
    // Overlay
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
    >
      {/* Modal */}
      <div
        className={`
          w-full max-w-lg max-h-[90vh] overflow-y-auto
          bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl
          ${dir === 'rtl' ? 'text-right' : 'text-left'}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── HEADER ──────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <span className="text-lg">{priorityStyle?.emoji ?? '🟡'}</span>
            <div>
              <span className="text-[10px] font-mono text-slate-400 tracking-wider">
                {task.task_code}
              </span>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">
                GÖREV DETAYI
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="text-[10px] font-bold px-3 py-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-all uppercase tracking-wider"
              >
                ✏️ Düzenle
              </button>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="text-[10px] font-bold px-3 py-1.5 rounded-lg border border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-all uppercase tracking-wider disabled:opacity-40"
                >
                  {isSaving ? '⏳' : '💾'} Kaydet
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="text-[10px] font-bold px-3 py-1.5 rounded-lg border border-slate-500/30 bg-slate-500/10 text-slate-400 hover:bg-slate-500/20 transition-all uppercase tracking-wider"
                >
                  İptal
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors text-xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        {/* ── İÇERİK ─────────────────────────────────────────── */}
        <div className="p-5 space-y-4">
          {/* Başlık */}
          <div>
            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">
              Başlık
            </label>
            {isEditing ? (
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500/50 focus:outline-none transition-colors"
              />
            ) : (
              <p className="text-sm font-semibold text-white">{task.title}</p>
            )}
          </div>

          {/* Açıklama */}
          <div>
            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">
              Açıklama
            </label>
            {isEditing ? (
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500/50 focus:outline-none transition-colors resize-none"
              />
            ) : (
              <p className="text-xs text-slate-400">{task.description || 'Açıklama yok'}</p>
            )}
          </div>

          {/* Öncelik + Durum (yan yana) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                Öncelik
              </label>
              {isEditing ? (
                <select
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value as TaskPriority)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500/50 focus:outline-none"
                >
                  {PRIORITY_OPTIONS.map(p => (
                    <option key={p.value} value={p.value}>{p.emoji} {p.label}</option>
                  ))}
                </select>
              ) : (
                <span className="text-xs font-bold text-slate-300">
                  {priorityStyle?.emoji} {priorityStyle?.label}
                </span>
              )}
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                Durum
              </label>
              {isEditing ? (
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as TaskStatus)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500/50 focus:outline-none"
                >
                  {STATUS_OPTIONS.map(s => (
                    <option key={s.value} value={s.value}>{s.emoji} {s.label}</option>
                  ))}
                </select>
              ) : (
                <span className="text-xs font-bold text-slate-300">
                  {STATUS_OPTIONS.find(s => s.value === task.status)?.emoji} {task.status}
                </span>
              )}
            </div>
          </div>

          {/* Atanan + Son Tarih */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                Atanan
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={editAssignedTo}
                  onChange={(e) => setEditAssignedTo(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500/50 focus:outline-none"
                />
              ) : (
                <span className="text-xs font-mono text-cyan-400">{task.assigned_to}</span>
              )}
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                Son Tarih
              </label>
              {isEditing ? (
                <input
                  type="date"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500/50 focus:outline-none"
                />
              ) : (
                <span className="text-xs text-slate-400">
                  {task.due_date ? new Date(task.due_date).toLocaleDateString('tr-TR') : '—'}
                </span>
              )}
            </div>
          </div>

          {/* Meta bilgi */}
          <div className="border-t border-slate-700/30 pt-3 space-y-1">
            <div className="flex justify-between text-[9px] text-slate-500">
              <span>Oluşturan</span>
              <span className="font-mono">{task.assigned_by}</span>
            </div>
            <div className="flex justify-between text-[9px] text-slate-500">
              <span>Oluşturulma</span>
              <span className="font-mono">{createdAt}</span>
            </div>
            <div className="flex justify-between text-[9px] text-slate-500">
              <span>Son Güncelleme</span>
              <span className="font-mono">{updatedAt}</span>
            </div>
            <div className="flex justify-between text-[9px] text-slate-500">
              <span>Kanıt</span>
              <span className={`font-bold ${task.evidence_provided ? 'text-green-400' : 'text-red-400'}`}>
                {task.evidence_provided ? '✅ Sağlandı' : '⏳ Bekleniyor'}
              </span>
            </div>
            <div className="flex justify-between text-[9px] text-slate-500">
              <span>Tekrar Sayısı</span>
              <span className="font-mono">{task.retry_count}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
