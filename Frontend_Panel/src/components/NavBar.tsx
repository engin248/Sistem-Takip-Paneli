"use client";
import { useLanguageStore } from "@/store/useLanguageStore";
import { useOperatorStore, type OperatorRole } from "@/store/useOperatorStore";
import { useAuthStore } from "@/store/useAuthStore";
import { logAudit } from "@/services/auditService";
import { signOut } from "@/services/authService";
import { t } from "@/lib/i18n";
import NotificationBell from "@/components/NotificationBell";

// ── TANIMLI OPERATÖRLER — Sistem konfigürasyonundan gelir ────
const OPERATORS: { name: string; role: OperatorRole }[] = [
  { name: 'SISTEM',   role: 'SİSTEM' },
  { name: 'ENGIN',    role: 'ADMIN' },
  { name: 'OPERATÖR', role: 'OPERATÖR' },
  { name: 'DENETÇI',  role: 'YÖNETİCİ' },
];

const LogoSVG = () => (
  <svg width="46" height="46" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0 drop-shadow-[0_0_12px_rgba(56,189,248,0.5)]">
    <defs>
      <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#3b82f6" fillOpacity="0.3" />
        <stop offset="100%" stopColor="#8b5cf6" fillOpacity="0.4" />
      </linearGradient>
      <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#93c5fd" />
        <stop offset="50%" stopColor="#e879f9" />
        <stop offset="100%" stopColor="#7dd3fc" />
      </linearGradient>
      <filter id="glow">
        <feGaussianBlur stdDeviation="3.5" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    {/* Outer hexagonal shield */}
    <path d="M60 8 L105 32 V88 L60 112 L15 88 V32 Z" fill="url(#shieldGrad)" stroke="url(#borderGrad)" strokeWidth="9" strokeLinejoin="round" />
    {/* Grid/Radar lines */}
    <path d="M60 8 V112 M15 32 L105 88 M15 88 L105 32" stroke="#e2e8f0" strokeWidth="1.5" opacity="0.4" />
    {/* Inner dashed ring */}
    <circle cx="60" cy="60" r="24" stroke="#7dd3fc" strokeWidth="4" opacity="0.9" strokeDasharray="8 6" className="origin-center animate-[spin_6s_linear_infinite]" />
    {/* Central core dot */}
    <circle cx="60" cy="60" r="12" fill="#bae6fd" filter="url(#glow)" className="animate-pulse" />
  </svg>
);

export default function NavBar() {
  const { lang, dir, toggleLang } = useLanguageStore();
  const { operator, setOperator } = useOperatorStore();
  const { user, clearAuth } = useAuthStore();
  const tr = t(lang);

  const handleSignOut = async () => {
    await signOut();
    clearAuth();
  };

  // Dil değişikliğini audit_logs'a mühürle
  const handleLangChange = (targetLang: 'tr' | 'ar') => {
    if (lang === targetLang) return;
    const previousLang = lang;
    const previousDir = dir;
    toggleLang();
    const newLang = targetLang;
    const newDir = targetLang === 'ar' ? 'rtl' : 'ltr';

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
    }).catch(() => {});
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
      case 'ADMIN':     return 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-600/50 shadow-[0_0_10px_rgba(168,85,247,0.2)]';
      case 'YÖNETİCİ':  return 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-600/50 shadow-[0_0_10px_rgba(59,130,246,0.2)]';
      case 'OPERATÖR':  return 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-300 dark:border-green-600/50 shadow-[0_0_10px_rgba(34,197,94,0.2)]';
      default:          return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600/50';
    }
  };

  return (
    <nav className="border-b border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0b1120] sticky top-0 z-50 shadow-sm dark:shadow-slate-900/50">
      <div className={`w-full px-6 py-5 sm:px-8 flex justify-between items-center ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
        
        {/* ── LOGO VE BAŞLIK ──────────────────────────────── */}
        <div className={`flex items-center gap-5 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
          <LogoSVG />
          <div className="flex flex-col justify-center">
            <span className="font-extrabold text-[26px] tracking-tight text-white drop-shadow-[0_2px_10px_rgba(255,255,255,0.3)] leading-none">
              {tr.panelTitle}
            </span>
            <span className="text-[11px] font-black text-cyan-400 uppercase tracking-[0.3em] mt-1.5 ml-0.5 drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]">
              {tr.panelSubtitle}
            </span>
          </div>
        </div>
        
        <div className={`flex items-center gap-5 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>

          {/* ── OPERATÖR SEÇİCİ ──────────────────────────────── */}
          <div className={`flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border-b border-t-0 border-l-0 border-r-0 border-slate-700/80 pl-3 pr-1 py-1 rounded-lg ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest drop-shadow-sm">
              {tr.permOperatorLabel}
            </span>
            <select
              id="operator-selector"
              value={operator.name}
              onChange={(e) => handleOperatorChange(e.target.value)}
              className={`text-[11px] uppercase font-bold px-3 py-1.5 rounded-md border-0 ring-1 ring-inset ring-slate-600/50 transition-all outline-none cursor-pointer ${getRoleColor()}`}
            >
              {OPERATORS.map((op) => (
                <option key={op.name} value={op.name} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  {op.name} ({op.role})
                </option>
              ))}
            </select>
          </div>

          <div className="w-px h-6 bg-slate-200 dark:bg-slate-800" />
          
          <NotificationBell />
          
          <div className="w-px h-6 bg-slate-200 dark:bg-slate-800" />
          
          {/* ── DİL GEÇİŞİ ──────────────────────────────────── */}
          <div className="flex gap-1 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-md border border-slate-200 dark:border-slate-700/50">
            <button
              onClick={() => handleLangChange('tr')}
              className={`text-[10px] font-bold px-3 py-1.5 rounded transition-all ${
                lang === 'tr' 
                  ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              TR
            </button>
            <button
              onClick={() => handleLangChange('ar')}
              className={`text-[10px] font-bold px-3 py-1.5 rounded transition-all ${
                lang === 'ar' 
                  ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              AR
            </button>
          </div>

          <div className="w-px h-6 bg-slate-200 dark:bg-slate-800" />

          {/* ── KULLANICI + ÇIKIŞ ─────────────────────────── */}
          <div className={`flex items-center gap-3 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
            {user?.email && (
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center border border-slate-300 dark:border-slate-700">
                  <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">
                    {user.email.substring(0, 2).toUpperCase()}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 max-w-[120px] truncate hidden sm:inline-block">
                  {user.email}
                </span>
              </div>
            )}
            <button
              onClick={handleSignOut}
              className="group flex items-center gap-2 text-[10px] font-bold px-3.5 py-1.5 rounded-md border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white dark:hover:bg-red-500 dark:hover:text-white dark:hover:border-red-500 transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-70 group-hover:opacity-100">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              {lang === 'ar' ? 'خروج' : 'ÇIKIŞ'}
            </button>
          </div>

        </div>
      </div>
    </nav>
  );
}
