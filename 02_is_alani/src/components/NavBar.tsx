"use client";
import { useLanguageStore } from "@/store/useLanguageStore";
import { useOperatorStore, type OperatorRole } from "@/store/useOperatorStore";
import { logAudit } from "@/services/auditService";
import { t } from "@/lib/i18n";
import NotificationBell from "@/components/NotificationBell";

// ── TANIMLI OPERATÖRLER — Sistem konfigürasyonundan gelir ────
const OPERATORS: { name: string; role: OperatorRole }[] = [
  { name: 'SISTEM',   role: 'SİSTEM' },
  { name: 'ENGIN',    role: 'ADMIN' },
  { name: 'OPERATÖR', role: 'OPERATÖR' },
  { name: 'DENETÇI',  role: 'YÖNETİCİ' },
];

export default function NavBar() {
  const { lang, dir, toggleLang } = useLanguageStore();
  const { operator, setOperator } = useOperatorStore();
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

  // Operatör değişikliğini audit_logs'a mühürle
  const handleOperatorChange = (name: string) => {
    const target = OPERATORS.find(op => op.name === name);
    if (!target || target.name === operator.name) return;

    const previous = operator.name;
    setOperator(target);

    logAudit({
      operation_type: 'UPDATE',
      action_description: `Operatör değiştirildi: ${previous} → ${target.name} (${target.role})`,
      metadata: {
        action_code: 'OPERATOR_CHANGED',
        previous_operator: previous,
        new_operator: target.name,
        new_role: target.role,
      }
    }).catch(() => {});
  };

  // Rol rengini belirle
  const getRoleColor = () => {
    switch (operator.role) {
      case 'ADMIN':     return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800';
      case 'YÖNETİCİ':  return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800';
      case 'OPERATÖR':  return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800';
      default:          return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700';
    }
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

          {/* ── OPERATÖR SEÇİCİ ──────────────────────────────── */}
          <div className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
              {tr.permOperatorLabel}
            </span>
            <select
              id="operator-selector"
              value={operator.name}
              onChange={(e) => handleOperatorChange(e.target.value)}
              className={`text-[10px] font-bold px-2 py-1 rounded border transition-all outline-none cursor-pointer ${getRoleColor()}`}
            >
              {OPERATORS.map((op) => (
                <option key={op.name} value={op.name}>
                  {op.name} ({op.role})
                </option>
              ))}
            </select>
          </div>

          <div className="w-px h-5 bg-slate-200 dark:bg-slate-700" />
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
