"use client";
import { useTaskStore } from '@/store/useTaskStore';

export default function Stats() {
  const { tasks } = useTaskStore();
  
  const stats = {
    toplam: tasks.length,
    bekleyen: tasks.filter(t => t.status === 'beklemede').length,
    tamamlanan: tasks.filter(t => t.status === 'tamamlandi').length,
  };

  return (
    <div className="grid grid-cols-3 gap-4 mb-8">
      <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-start">Toplam Emir</p>
        <p className="text-2xl font-black text-start">{stats.toplam}</p>
      </div>
      <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-100 dark:border-amber-900/30">
        <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest text-start">Beklemede</p>
        <p className="text-2xl font-black text-amber-700 dark:text-amber-500 text-start">{stats.bekleyen}</p>
      </div>
      <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest text-start">Tamamlanan</p>
        <p className="text-2xl font-black text-emerald-700 dark:text-emerald-500 text-start">{stats.tamamlanan}</p>
      </div>
    </div>
  );
}
