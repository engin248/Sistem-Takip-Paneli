"use client";
import { useLanguageStore } from "@/store/useLanguageStore";
import { logAudit } from "@/services/auditService";
import { t } from "@/lib/i18n";
import NotificationBell from "@/components/NotificationBell";

export default function NavBar() {
  const { lang, dir, toggleLang } = useLanguageStore();
  const tr = t(lang);

  // Dil değişikliğini audit_logs'a mühürle
  const handleLangChange = (targetLang: 'tr' | 'ar') => {
    if (lang === targetLang) return;
    const previousLang = lang;
    const previousDir = dir;
    toggleLang();
    const newLang = targetLang;
    const newDir = targetLang === 'ar' ? 'rtl' : 'ltr';

    // Audit log yaz — bağlantı yoksa sessizce atlanır (isConnectionValid ön kontrolü auditService içinde)
    logAudit({
      operation_type: 'UPDATE',
      action_description: `Dil değiştirildi: ${previousLang.toUpperCase()} → ${newLang.toUpperCase()} | Yön: ${previousDir.toUpperCase()} → ${newDir.toUpperCase()}`,
      metadata: {
        action_code: 'LANGUAGE_CHANGED',
        previous_lang: previousLang,
        new_lang: newLang,
        previous_dir: previousDir,
        new_dir: newDir
      }
    }).catch(() => {
      // Bağlantı yoksa sessizce devam et — hata zaten auditService içinde kodlanıyor
    });
  };

  return (
    <nav className="border-b p-4 bg-white dark:bg-slate-900 sticky top-0 z-50">
      <div className={`container mx-auto flex justify-between items-center ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
        <div className={`flex items-center gap-3 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
          <span className="font-black text-lg tracking-tight">{tr.panelTitle}</span>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
            {tr.panelSubtitle}
          </span>
        </div>
        <div className={`flex items-center gap-3 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
          <NotificationBell />
          <div className="w-px h-5 bg-slate-200 dark:bg-slate-700" />
          <button
            onClick={() => handleLangChange('tr')}
            className={`text-[10px] font-bold px-3 py-1 rounded border transition-all ${
              lang === 'tr' 
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900' 
                : 'border-slate-300 text-slate-500 hover:border-slate-500'
            }`}
          >
            TR
          </button>
          <button
            onClick={() => handleLangChange('ar')}
            className={`text-[10px] font-bold px-3 py-1 rounded border transition-all ${
              lang === 'ar' 
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900' 
                : 'border-slate-300 text-slate-500 hover:border-slate-500'
            }`}
          >
            AR
          </button>
        </div>
      </div>
    </nav>
  );
}
