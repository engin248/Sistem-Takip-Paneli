"use client";
import { useTaskStore } from '@/store/useTaskStore';

// SCR-02 OPS İSTATİSTİK — Karargah tasarımıyla uyumlu
export default function Stats() {
  const { tasks } = useTaskStore();

  const stats = {
    toplam: tasks.length,
    bekleyen: tasks.filter(t => t.status === 'beklemede').length,
    devam: tasks.filter(t => t.status === 'devam_ediyor').length,
    dogrulama: tasks.filter(t => t.status === 'dogrulama').length,
    tamamlanan: tasks.filter(t => t.status === 'tamamlandi').length,
    reddedilen: tasks.filter(t => t.status === 'reddedildi').length,
    iptal: tasks.filter(t => t.status === 'iptal').length,
    kritik: tasks.filter(t => t.priority === 'kritik').length,
    yuksek: tasks.filter(t => t.priority === 'yuksek').length,
  };

  const tamamlanmaOrani = stats.toplam > 0
    ? Math.round((stats.tamamlanan / stats.toplam) * 100)
    : 0;

  const DURUM_METRIKLERI = [
    { label: 'TOPLAM', value: stats.toplam, color: 'cyan', icon: '◈' },
    { label: 'BEKLEMEDE', value: stats.bekleyen, color: 'amber', icon: '⏳' },
    { label: 'DEVAM', value: stats.devam, color: 'blue', icon: '⚡' },
    { label: 'DOĞRULAMA', value: stats.dogrulama, color: 'purple', icon: '🔍' },
    { label: 'TAMAMLANDI', value: stats.tamamlanan, color: 'green', icon: '✅' },
    { label: 'REDDEDİLDİ', value: stats.reddedilen, color: 'red', icon: '❌' },
    { label: 'İPTAL', value: stats.iptal, color: 'slate', icon: '🚫' },
  ];

  const colorCls: Record<string, { text: string; border: string; bg: string }> = {
    cyan: { text: 'text-cyan-400', border: 'border-cyan-500/30', bg: 'bg-cyan-500/10' },
    amber: { text: 'text-amber-400', border: 'border-amber-500/30', bg: 'bg-amber-500/10' },
    blue: { text: 'text-blue-400', border: 'border-blue-500/30', bg: 'bg-blue-500/10' },
    purple: { text: 'text-purple-400', border: 'border-purple-500/30', bg: 'bg-purple-500/10' },
    green: { text: 'text-green-400', border: 'border-green-500/30', bg: 'bg-green-500/10' },
    red: { text: 'text-red-400', border: 'border-red-500/30', bg: 'bg-red-500/10' },
    slate: { text: 'text-slate-400', border: 'border-slate-500/30', bg: 'bg-slate-500/10' },
  };

  return (
    <div className="space-y-4">

      {/* ── Durum Metrikleri ─────────────────────────────────── */}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {DURUM_METRIKLERI.map((m) => {
          const c = colorCls[m.color] ?? colorCls.cyan!;
          return (
            <div
              key={m.label}
              className={`rounded-none border ${c.border} ${c.bg} p-3 flex flex-col items-center gap-1`}
            >
              <span className="text-lg">{m.icon}</span>
              <span className={`text-2xl font-black ${c.text}`}>{m.value}</span>
              <span className={`text-[8px] font-black tracking-[0.15em] uppercase ${c.text} opacity-70`}>
                {m.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* ── Tamamlanma Oranı Progress Bar ───────────────────── */}
      <div className="rounded-none border border-slate-700/30 bg-slate-900/30 p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[9px] font-black tracking-[0.2em] uppercase text-slate-400">
            TAMAMLANMA ORANI
          </span>
          <span className="text-[10px] font-black text-green-400">
            %{tamamlanmaOrani}
          </span>
        </div>
        <div className="h-2 rounded-none bg-slate-800 overflow-hidden">
          <div
            className="h-full rounded-none bg-gradient-to-r from-green-500 to-cyan-500 transition-all duration-700"
            style={{ width: `${tamamlanmaOrani}%` }}
          />
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-[8px] font-mono text-slate-600">
            🔴 KRİTİK: {stats.kritik} &nbsp;|&nbsp; 🟠 YÜKSEK: {stats.yuksek}
          </span>
          <span className="text-[8px] font-mono text-slate-600">
            {stats.tamamlanan}/{stats.toplam} görev
          </span>
        </div>
      </div>

    </div>
  );
}
