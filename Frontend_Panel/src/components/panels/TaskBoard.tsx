"use client";
import { useState, useRef, useCallback, useMemo } from 'react';
import { useTaskStore, type Task, type TaskStatus } from '@/store/useTaskStore';
import { updateStatus } from '@/services/taskService';
import { useLanguageStore } from '@/store/useLanguageStore';
import { t } from '@/lib/i18n';
import { toast } from 'sonner';

// ============================================================
// KANBAN SÜTUN TANIMLARI
// SQL CHECK kısıtlamalarıyla (useTaskStore.ts) HARFİYEN eşleşir.
// 4 ana sütun: beklemede → devam_ediyor → dogrulama → tamamlandi
// ============================================================
interface KanbanColumn {
  id: TaskStatus;
  i18nKey: 'kanbanTodo' | 'kanbanDoing' | 'kanbanReview' | 'kanbanSealed';
  icon: string;
  accentLight: string;
  accentDark: string;
  borderLight: string;
  borderDark: string;
  headerGradientFrom: string;
  headerGradientTo: string;
  badgeBg: string;
  badgeText: string;
  dropHighlight: string;
}

const COLUMNS: KanbanColumn[] = [
  {
    id: 'beklemede',
    i18nKey: 'kanbanTodo',
    icon: '📥',
    accentLight: 'bg-slate-50',
    accentDark: 'dark:bg-slate-900/60',
    borderLight: 'border-slate-200',
    borderDark: 'dark:border-slate-700/50',
    headerGradientFrom: 'from-slate-100',
    headerGradientTo: 'to-slate-50',
    badgeBg: 'bg-slate-200 dark:bg-slate-700',
    badgeText: 'text-slate-700 dark:text-slate-200',
    dropHighlight: 'ring-slate-400',
  },
  {
    id: 'devam_ediyor',
    i18nKey: 'kanbanDoing',
    icon: '⚡',
    accentLight: 'bg-blue-50/80',
    accentDark: 'dark:bg-blue-950/30',
    borderLight: 'border-blue-200',
    borderDark: 'dark:border-blue-800/40',
    headerGradientFrom: 'from-blue-100',
    headerGradientTo: 'to-blue-50',
    badgeBg: 'bg-blue-200 dark:bg-blue-800',
    badgeText: 'text-blue-800 dark:text-blue-100',
    dropHighlight: 'ring-blue-400',
  },
  {
    id: 'dogrulama',
    i18nKey: 'kanbanReview',
    icon: '🔍',
    accentLight: 'bg-amber-50/80',
    accentDark: 'dark:bg-amber-950/20',
    borderLight: 'border-amber-200',
    borderDark: 'dark:border-amber-800/40',
    headerGradientFrom: 'from-amber-100',
    headerGradientTo: 'to-amber-50',
    badgeBg: 'bg-amber-200 dark:bg-amber-800',
    badgeText: 'text-amber-800 dark:text-amber-100',
    dropHighlight: 'ring-amber-400',
  },
  {
    id: 'tamamlandi',
    i18nKey: 'kanbanSealed',
    icon: '🔒',
    accentLight: 'bg-emerald-50/80',
    accentDark: 'dark:bg-emerald-950/20',
    borderLight: 'border-emerald-200',
    borderDark: 'dark:border-emerald-800/40',
    headerGradientFrom: 'from-emerald-100',
    headerGradientTo: 'to-emerald-50',
    badgeBg: 'bg-emerald-200 dark:bg-emerald-800',
    badgeText: 'text-emerald-800 dark:text-emerald-100',
    dropHighlight: 'ring-emerald-400',
  },
];

// ─── ÖNCELİK ROZET STİLİ ───────────────────────────────────
const PRIORITY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  kritik:  { bg: 'bg-red-100 dark:bg-red-900/30',    text: 'text-red-700 dark:text-red-300',       label: '🔴' },
  yuksek:  { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300', label: '🟠' },
  normal:  { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300', label: '🟡' },
  dusuk:   { bg: 'bg-green-100 dark:bg-green-900/30',  text: 'text-green-700 dark:text-green-300',   label: '🟢' },
};

// ============================================================
// KANBAN KART BİLEşENİ
// ============================================================
function KanbanCard({
  task,
  onDragStart,
  isDragging,
  dir,
}: {
  task: Task;
  onDragStart: (e: React.DragEvent, task: Task) => void;
  isDragging: boolean;
  dir: string;
}) {
  const priorityStyle = PRIORITY_STYLES[task.priority] ?? PRIORITY_STYLES['normal']!;
  const createdDate = new Date(task.created_at);
  const timeStr = createdDate.toLocaleTimeString(dir === 'rtl' ? 'ar-SA' : 'tr-TR', {
    hour: '2-digit', minute: '2-digit',
  });
  const dateStr = createdDate.toLocaleDateString(dir === 'rtl' ? 'ar-SA' : 'tr-TR', {
    day: '2-digit', month: '2-digit',
  });

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      className={`
        group relative p-3 rounded-xl border cursor-grab active:cursor-grabbing
        bg-white dark:bg-slate-800/90
        border-slate-200/80 dark:border-slate-700/50
        shadow-sm hover:shadow-md
        transition-all duration-200 ease-out
        hover:-translate-y-0.5 hover:border-slate-300 dark:hover:border-slate-600
        ${isDragging ? 'opacity-40 scale-95 rotate-1 ring-2 ring-blue-400' : ''}
      `}
    >
      {/* Öncelik göstergesi — sol/sağ kenar çizgisi */}
      <div
        className={`absolute top-2.5 bottom-2.5 ${dir === 'rtl' ? 'right-0 rounded-r-none rounded-l-full' : 'left-0 rounded-l-none rounded-r-full'} w-1 ${priorityStyle.bg} ${priorityStyle.text}`}
        style={{ borderRadius: dir === 'rtl' ? '0 3px 3px 0' : '3px 0 0 3px' }}
      />

      {/* Başlık */}
      <h4 className={`font-semibold text-[13px] text-slate-800 dark:text-slate-100 leading-snug ${dir === 'rtl' ? 'pr-3' : 'pl-3'} line-clamp-2`}>
        {task.title}
      </h4>

      {/* Alt bilgi satırı */}
      <div className={`flex items-center gap-2 mt-2 ${dir === 'rtl' ? 'flex-row-reverse pr-3' : 'pl-3'}`}>
        {/* Öncelik rozeti */}
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${priorityStyle.bg} ${priorityStyle.text}`}>
          {priorityStyle.label}
        </span>
        {/* Görev kodu */}
        <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 tracking-tight">
          {task.task_code || task.id.slice(0, 8)}
        </span>
        {/* Zaman */}
        <span className="text-[9px] text-slate-400 dark:text-slate-500 ms-auto">
          {dateStr} {timeStr}
        </span>
        {/* Son tarih badge */}
        {task.due_date && (() => {
          const remaining = Math.ceil((new Date(task.due_date).getTime() - Date.now()) / 86400000);
          const color = remaining < 0
            ? 'text-red-400 bg-red-900/30 border-red-500/30'
            : remaining <= 1
              ? 'text-orange-400 bg-orange-900/30 border-orange-500/30'
              : 'text-emerald-400 bg-emerald-900/30 border-emerald-500/30';
          return (
            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${color}`}>
              {remaining < 0 ? `⏰ ${Math.abs(remaining)}g GEÇTİ` : `📅 ${remaining}g`}
            </span>
          );
        })()}
      </div>

      {/* Sürükle göstergesi */}
      <div className={`absolute top-1.5 ${dir === 'rtl' ? 'left-2' : 'right-2'} opacity-0 group-hover:opacity-40 transition-opacity`}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" className="text-slate-400">
          <circle cx="3" cy="3" r="1.2" /><circle cx="9" cy="3" r="1.2" />
          <circle cx="3" cy="6" r="1.2" /><circle cx="9" cy="6" r="1.2" />
          <circle cx="3" cy="9" r="1.2" /><circle cx="9" cy="9" r="1.2" />
        </svg>
      </div>
    </div>
  );
}

// ============================================================
// ANA KANBAN PANO BİLEşENİ
// ============================================================
export default function TaskBoard() {
  const { tasks } = useTaskStore();
  const { lang, dir } = useLanguageStore();
  const tr = t(lang);

  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const dragCounter = useRef<Record<string, number>>({});

  // ── FİLTRE STATE ──────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterAgent, setFilterAgent] = useState<string>('all');

  // Unique ajanlar
  const uniqueAgents = useMemo(() => {
    const agents = [...new Set(tasks.map(t => t.assigned_to))].sort();
    return agents;
  }, [tasks]);

  // ── SÜRÜKLE BAşLAT ────────────────────────────────────────
  const handleDragStart = useCallback((e: React.DragEvent, task: Task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.id);
    // Şeffaf sürükleme görüntüsü
    if (e.currentTarget instanceof HTMLElement) {
      const ghost = e.currentTarget.cloneNode(true) as HTMLElement;
      ghost.style.opacity = '0.85';
      ghost.style.transform = 'rotate(2deg)';
      ghost.style.position = 'absolute';
      ghost.style.top = '-9999px';
      document.body.appendChild(ghost);
      e.dataTransfer.setDragImage(ghost, 20, 20);
      requestAnimationFrame(() => document.body.removeChild(ghost));
    }
  }, []);

  // ── SÜTUNA GİRİŞ ─────────────────────────────────────────
  const handleDragEnter = useCallback((e: React.DragEvent, columnId: TaskStatus) => {
    e.preventDefault();
    dragCounter.current[columnId] = (dragCounter.current[columnId] || 0) + 1;
    setDragOverColumn(columnId);
  }, []);

  // ── SÜTUNDAN ÇIKIŞ ────────────────────────────────────────
  const handleDragLeave = useCallback((e: React.DragEvent, columnId: TaskStatus) => {
    e.preventDefault();
    dragCounter.current[columnId] = (dragCounter.current[columnId] || 0) - 1;
    if (dragCounter.current[columnId] <= 0) {
      dragCounter.current[columnId] = 0;
      if (dragOverColumn === columnId) {
        setDragOverColumn(null);
      }
    }
  }, [dragOverColumn]);

  // ── SÜTUN ÜZERİNDE ───────────────────────────────────────
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  // ── BIRAK → DURUM GÜNCELLE ────────────────────────────────
  const handleDrop = useCallback(async (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    dragCounter.current = {};

    if (!draggedTask || draggedTask.status === targetStatus) {
      setDraggedTask(null);
      return;
    }

    const taskId = draggedTask.id;
    const previousStatus = draggedTask.status;
    setDraggedTask(null);
    setUpdatingTaskId(taskId);

    try {
      await updateStatus(taskId, targetStatus);

      // TR/AR uyumlu başarı mesajı
      const columnLabels: Record<string, string> = {
        beklemede: tr.kanbanTodo,
        devam_ediyor: tr.kanbanDoing,
        dogrulama: tr.kanbanReview,
        tamamlandi: tr.kanbanSealed,
      };
      const fromLabel = columnLabels[previousStatus] || previousStatus;
      const toLabel = columnLabels[targetStatus] || targetStatus;
      toast.success(`${fromLabel} → ${toLabel}`, {
        description: draggedTask.title,
        duration: 3000,
      });
    } finally {
      setUpdatingTaskId(null);
    }
  }, [draggedTask, tr]);

  // ── SÜRÜKLE BİTİR ────────────────────────────────────────
  const handleDragEnd = useCallback(() => {
    setDraggedTask(null);
    setDragOverColumn(null);
    dragCounter.current = {};
  }, []);

  // ── GÖREV FİLTRELEME ─────────────────────────────────────
  // Kanban'da gösterilecek durumlar (reddedildi/iptal hariç)
  // + arama/öncelik/ajan filtresi
  const getTasksForColumn = useCallback((status: TaskStatus): Task[] => {
    return tasks.filter(task => {
      if (task.status !== status) return false;

      // Arama filtresi
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = task.title.toLowerCase().includes(q);
        const matchDesc = task.description?.toLowerCase().includes(q) ?? false;
        const matchCode = task.task_code?.toLowerCase().includes(q) ?? false;
        if (!matchTitle && !matchDesc && !matchCode) return false;
      }

      // Öncelik filtresi
      if (filterPriority !== 'all' && task.priority !== filterPriority) return false;

      // Ajan filtresi
      if (filterAgent !== 'all' && task.assigned_to !== filterAgent) return false;

      return true;
    });
  }, [tasks, searchQuery, filterPriority, filterAgent]);

  // ── TOPLAM AKTİF GÖREV ───────────────────────────────────
  const totalKanbanTasks = COLUMNS.reduce((sum, col) => sum + getTasksForColumn(col.id).length, 0);
  const isFiltered = searchQuery.trim() || filterPriority !== 'all' || filterAgent !== 'all';

  return (
    <section className="mb-12">
      {/* ── BAşLIK ──────────────────────────────────────────── */}
      <div className={`flex items-center gap-3 mb-5 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
        <h2 className="text-sm font-bold text-slate-500 tracking-widest uppercase text-start">
          {tr.kanbanTitle}
        </h2>
        <span className="text-[9px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full">
          {totalKanbanTasks}
        </span>
      </div>

      {/* ── FİLTRE PANELİ ────────────────────────────────────── */}
      <div className={`flex flex-wrap gap-2 mb-4 items-center ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
        {/* Arama */}
        <div className="relative flex-1 min-w-[160px]">
          <input
            id="task-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 Görev ara... (başlık, açıklama, kod)"
            className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none focus:ring-1 focus:ring-cyan-500/50 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Öncelik filtresi */}
        <select
          id="task-filter-priority"
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="bg-slate-800/50 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-cyan-500/50"
        >
          <option value="all">Tüm Öncelik</option>
          <option value="kritik">🔴 Kritik</option>
          <option value="yuksek">🟠 Yüksek</option>
          <option value="normal">🟡 Normal</option>
          <option value="dusuk">🟢 Düşük</option>
        </select>

        {/* Ajan filtresi */}
        <select
          id="task-filter-agent"
          value={filterAgent}
          onChange={(e) => setFilterAgent(e.target.value)}
          className="bg-slate-800/50 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-cyan-500/50"
        >
          <option value="all">Tüm Ajanlar</option>
          {uniqueAgents.map(a => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>

        {/* Filtre temizle butonu */}
        {isFiltered && (
          <button
            onClick={() => { setSearchQuery(''); setFilterPriority('all'); setFilterAgent('all'); }}
            className="text-[9px] font-bold px-2 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all uppercase tracking-wider"
          >
            ✕ Temizle
          </button>
        )}
      </div>

      {/* ── KANBAN GRİD — 4 Sütun ────────────────────────── */}
      <div
        className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${dir === 'rtl' ? 'direction-rtl' : ''}`}
        onDragEnd={handleDragEnd}
      >
        {COLUMNS.map((column) => {
          const columnTasks = getTasksForColumn(column.id);
          const isDropTarget = dragOverColumn === column.id && draggedTask?.status !== column.id;
          const isSameColumn = draggedTask?.status === column.id;

          return (
            <div
              key={column.id}
              onDragEnter={(e) => handleDragEnter(e, column.id)}
              onDragLeave={(e) => handleDragLeave(e, column.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
              className={`
                flex flex-col rounded-2xl border overflow-hidden
                ${column.accentLight} ${column.accentDark}
                ${column.borderLight} ${column.borderDark}
                transition-all duration-300 ease-out
                ${isDropTarget ? `ring-2 ${column.dropHighlight} scale-[1.02] shadow-lg` : ''}
                ${isSameColumn ? 'opacity-70' : ''}
                min-h-[280px]
              `}
            >
              {/* ── SÜTUN BAşLIĞI ─────────────────────────── */}
              <div className={`
                flex items-center justify-between px-4 py-3
                bg-gradient-to-b ${column.headerGradientFrom} ${column.headerGradientTo}
                dark:from-transparent dark:to-transparent
                border-b ${column.borderLight} ${column.borderDark}
                ${dir === 'rtl' ? 'flex-row-reverse' : ''}
              `}>
                <div className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                  <span className="text-base">{column.icon}</span>
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                    {tr[column.i18nKey]}
                  </span>
                </div>
                <span className={`
                  text-[10px] font-black min-w-[22px] h-[22px]
                  flex items-center justify-center rounded-full
                  ${column.badgeBg} ${column.badgeText}
                `}>
                  {columnTasks.length}
                </span>
              </div>

              {/* ── KART LİSTESİ ─────────────────────────── */}
              <div className="flex-1 p-2.5 space-y-2 overflow-y-auto max-h-[400px] scroll-smooth">
                {columnTasks.length === 0 && (
                  <div className={`
                    flex flex-col items-center justify-center py-8 px-3
                    border-2 border-dashed rounded-xl
                    ${column.borderLight} ${column.borderDark}
                    transition-all duration-300
                    ${isDropTarget ? 'border-solid scale-105 bg-white/50 dark:bg-slate-800/50' : ''}
                  `}>
                    <span className="text-2xl mb-1.5 opacity-40">
                      {isDropTarget ? '⬇️' : column.icon}
                    </span>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium text-center">
                      {isDropTarget ? tr.kanbanDropHere : tr.kanbanEmpty}
                    </p>
                  </div>
                )}

                {columnTasks.map((task) => (
                  <div
                    key={task.id}
                    className={`transition-opacity duration-200 ${updatingTaskId === task.id ? 'opacity-40 pointer-events-none animate-pulse' : ''}`}
                  >
                    <KanbanCard
                      task={task}
                      onDragStart={handleDragStart}
                      isDragging={draggedTask?.id === task.id}
                      dir={dir}
                    />
                  </div>
                ))}

                {/* Bırakma hedefi göstergesi (kartlar varken) */}
                {isDropTarget && columnTasks.length > 0 && (
                  <div className={`
                    flex items-center justify-center py-3 px-3
                    border-2 border-dashed rounded-xl
                    ${column.borderLight} ${column.borderDark}
                    border-solid bg-white/30 dark:bg-slate-800/30
                    animate-pulse
                  `}>
                    <span className="text-[10px] text-slate-400 font-medium">⬇️ {tr.kanbanDropHere}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
