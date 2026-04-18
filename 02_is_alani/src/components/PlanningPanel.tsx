"use client";
import { useEffect, useState, useCallback } from 'react';

export default function PlanningPanel() {
  const [plans, setPlans] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [assignee, setAssignee] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [pRes, aRes] = await Promise.all([fetch('/api/planning'), fetch('/api/agents')]);
      const pData = await pRes.json();
      const aData = await aRes.json();
      if (pData?.success) setPlans(pData.plans || []);
      if (aData?.success) setAgents(aData.agents || []);
    } catch (e) {
      // ignore
    }
  }, []);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const handleCreate = useCallback(async () => {
    if (!title.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/planning', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: title.trim(), description: desc, assignee }) });
      const data = await res.json();
      if (data?.success) {
        setTitle(''); setDesc(''); setAssignee(null);
        void fetchData();
      }
    } finally { setLoading(false); }
  }, [title, desc, assignee, fetchData]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[10px] font-black text-cyan-400 uppercase">Yönetim & Planlama</h3>
          <p className="text-[8px] text-slate-500">Plan oluşturun, ajana atayın ve durumu izleyin (yerel hub).</p>
        </div>
      </div>

      <div className="glass-card p-3 border border-slate-700/30">
        <div className="flex gap-2 mb-2">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Plan başlığı" className="flex-1 bg-slate-950/80 border border-slate-700/40 rounded px-2 py-2 text-sm" />
          <select value={assignee ?? ''} onChange={e => setAssignee(e.target.value || null)} className="w-48 bg-slate-950/80 border border-slate-700/40 rounded px-2 py-2 text-sm">
            <option value="">Atama yok (planla)</option>
            {agents.map(a => (<option key={a.id} value={a.id}>{a.id} — {a.kod_adi} ({a.durum})</option>))}
          </select>
          <button onClick={() => void handleCreate()} disabled={loading} className="px-3 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded">{loading ? '⟳' : 'Plan Oluştur'}</button>
        </div>
        <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Açıklama (opsiyonel)" className="w-full bg-slate-950/80 border border-slate-700/40 rounded px-2 py-2 text-sm h-20" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="glass-card p-3 border border-slate-700/30">
          <h4 className="text-[9px] font-black text-slate-400 uppercase mb-2">Mevcut Planlar</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {plans.length === 0 && <div className="text-[9px] text-slate-500 italic">Plan yok</div>}
            {plans.map(p => (
              <div key={p.id} className="p-2 border rounded bg-slate-900/30">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-bold">{p.title}</div>
                  <div className="text-[8px] font-mono text-slate-500">{p.id}</div>
                </div>
                <div className="text-[8px] text-slate-400">{p.description}</div>
                <div className="text-[8px] text-slate-500 mt-1">Atanan: {p.assignee ?? '—' } • {p.status}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-3 border border-slate-700/30">
          <h4 className="text-[9px] font-black text-slate-400 uppercase mb-2">Ajan Durumları</h4>
          <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
            {agents.map(a => (
              <div key={a.id} className="p-2 border rounded flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold">{a.kod_adi} <span className="text-[8px] text-slate-500">{a.id}</span></div>
                  <div className="text-[8px] text-slate-400">{a.rol}</div>
                </div>
                <div className="text-[9px] font-mono text-slate-500">{a.durum}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
