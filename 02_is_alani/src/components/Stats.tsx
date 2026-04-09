"use client";
import { useTaskStore } from '@/store/useTaskStore';
import { useLanguageStore } from '@/store/useLanguageStore';
import { t } from '@/lib/i18n';

export default function Stats() {
  const { tasks } = useTaskStore();
  const { lang, dir } = useLanguageStore();
  const tr = t(lang);
  
  const stats = {
    toplam: tasks.length,
    bekleyen: tasks.filter(t => t.status === 'beklemede').length,
    devam: tasks.filter(t => t.status === 'devam_ediyor').length,
    dogrulama: tasks.filter(t => t.status === 'dogrulama').length,
    tamamlanan: tasks.filter(t => t.status === 'tamamlandi').length,
    reddedilen: tasks.filter(t => t.status === 'reddedildi').length,
    iptal: tasks.filter(t => t.status === 'iptal').length,
  };

  return (
    <div className={`grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-8 ${dir === 'rtl' ? 'direction-rtl' : ''}`}>
      <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest text-start">{tr.totalOrders}</p>
        <p className="text-xl font-black text-start">{stats.toplam}</p>
      </div>
      <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-xl border border-amber-100 dark:border-amber-900/30">
        <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest text-start">{tr.pending}</p>
        <p className="text-xl font-black text-amber-700 dark:text-amber-500 text-start">{stats.bekleyen}</p>
      </div>
      <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-100 dark:border-blue-900/30">
        <p className="text-[9px] font-bold text-blue-600 uppercase tracking-widest text-start">{tr.statusInProgress}</p>
        <p className="text-xl font-black text-blue-700 dark:text-blue-500 text-start">{stats.devam}</p>
      </div>
      <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-xl border border-orange-100 dark:border-orange-900/30">
        <p className="text-[9px] font-bold text-orange-600 uppercase tracking-widest text-start">{tr.statusVerification}</p>
        <p className="text-xl font-black text-orange-700 dark:text-orange-500 text-start">{stats.dogrulama}</p>
      </div>
      <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
        <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest text-start">{tr.completed}</p>
        <p className="text-xl font-black text-emerald-700 dark:text-emerald-500 text-start">{stats.tamamlanan}</p>
      </div>
      <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-xl border border-red-100 dark:border-red-900/30">
        <p className="text-[9px] font-bold text-red-600 uppercase tracking-widest text-start">{tr.statusRejected}</p>
        <p className="text-xl font-black text-red-700 dark:text-red-500 text-start">{stats.reddedilen}</p>
      </div>
      <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest text-start">{tr.statusCancelled}</p>
        <p className="text-xl font-black text-slate-500 text-start">{stats.iptal}</p>
      </div>
    </div>
  );
}

