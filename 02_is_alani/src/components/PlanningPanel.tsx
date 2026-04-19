"use client";
import { useEffect, useState, useCallback } from 'react';

export default function PlanningPanel() {
  const [plans, setPlans] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [assignee, setAssignee] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiModel, setAiModel] = useState<string>('ollama');
  const [aiGoal, setAiGoal] = useState('');

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

  const [hatStatus, setHatStatus] = useState<string | null>(null);

  const handleCreate = useCallback(async () => {
    if (!title.trim()) return;
    setLoading(true);
    setHatStatus(null);
    try {
      // 1. Plan oluştur (mevcut akış)
      const res = await fetch('/api/planning', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: title.trim(), description: desc, assignee }) });
      const data = await res.json();
      if (data?.success) {
        // 2. RED_LINE_TASKS'a fırlat — manager.lpush('RED_LINE_TASKS', payload)
        try {
          const hatRes = await fetch('/api/hat/push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              plan_id    : data.plan?.id,
              title      : title.trim(),
              description: desc,
              assignee,
              priority   : 'normal',
            }),
          });
          const hatData = await hatRes.json();
          if (hatData?.success) {
            setHatStatus(`⚡ RED_LINE fırlatıldı: ${hatData.hat_id}`);
          }
        } catch {
          setHatStatus('⚠️ RED_LINE bağlantısı kurulamadı');
        }

        setTitle(''); setDesc(''); setAssignee(null);
        void fetchData();
      }
    } finally { setLoading(false); }
  }, [title, desc, assignee, fetchData]);

  const handleAiPlan = async () => {
    if (!aiGoal.trim()) return;
    setAiLoading(true);
    setHatStatus('Otonom Kurmay Zekası hesaplıyor...');
    try {
      const res = await fetch('/api/ai/kurmay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hedef: aiGoal, model: aiModel })
      });
      const data = await res.json();
      if (data.success && data.ai_plans) {
        setTitle(data.ai_plans[0]?.title || 'Otonom Görev');
        setDesc(data.ai_plans[0]?.description || '');
        setHatStatus('✔ Strateji Çıkarıldı. Manuel kontrolden sonra "Plan Oluştur" diyebilirsiniz.');
      } else {
        setHatStatus('⚠️ Hata: ' + data.error);
      }
    } catch (e) {
      setHatStatus('⚠️ Bağlantı hatası.');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[10px] font-black text-cyan-400 uppercase">Yönetim & Planlama</h3>
          <p className="text-[8px] text-slate-500">Plan oluşturun, ajana atayın ve durumu izleyin (yerel hub).</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* SOL: Manuel Giriş */}
        <div className="glass-card p-3 border border-slate-700/30">
          <h4 className="text-[9px] font-black text-amber-400 uppercase tracking-widest mb-2 border-b border-amber-500/20 pb-1">İNSAN / MANUEL PLANLAMA</h4>
          <div className="flex gap-2 mb-2">
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Plan başlığı" className="flex-1 bg-slate-950/80 border border-slate-700/40 rounded px-2 py-2 text-sm text-cyan-200" />
            <select value={assignee ?? ''} onChange={e => setAssignee(e.target.value || null)} className="w-48 bg-slate-950/80 border border-slate-700/40 rounded px-2 py-2 text-[10px] uppercase">
              <option value="">Atama yok</option>
              {agents.map(a => (<option key={a.id} value={a.id}>{a.id} — {a.kod_adi}</option>))}
            </select>
          </div>
          <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Açıklama (opsiyonel)" className="w-full bg-slate-950/80 border border-slate-700/40 rounded px-2 py-2 text-sm h-20 mb-2" />
          <button onClick={() => void handleCreate()} disabled={loading} className="w-full px-3 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 font-black tracking-widest text-[10px] rounded transition-all hover:bg-amber-500/20">{loading ? '⟳ İŞLENİYOR...' : 'GÖREVİ OLUŞTUR VE YAYINLA'}</button>
        </div>

        {/* SAĞ: Otonom Kurmay AI Girişi */}
        <div className="glass-card p-3 border border-slate-700/30 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-1 h-full bg-cyan-500/30"></div>
          <h4 className="text-[9px] font-black text-cyan-400 uppercase tracking-widest mb-2 border-b border-cyan-500/20 pb-1 flex justify-between">
            <span>OTONOM KURMAY (AI PLANNING)</span>
            <span className="text-[8px] text-cyan-500 font-mono italic">MASTER-SHADOW MODE</span>
          </h4>
          <div className="flex gap-2 mb-2">
            <select value={aiModel} onChange={e => setAiModel(e.target.value)} className="w-48 bg-slate-950/80 border border-cyan-700/40 text-cyan-200 rounded px-2 py-2 text-[10px] uppercase font-bold neon-glow-cyan">
              <optgroup label="✨ SİSTEM TAKİP PANELİ OTONOMİSİ">
                <option value="system_matrix">TAM OTONOM (Qwen 2.5 + Phi-3)</option>
              </optgroup>
              <optgroup label="LOKAL AJANLAR (Offline)">
                <option value="qwen2.5">USTA: QWEN 2.5 (Planlama)</option>
                <option value="phi3">SNIPER: PHI-3 (Güvenlik)</option>
                <option value="mistral">GÖLGE: MISTRAL (Çürütme)</option>
                <option value="llama3.1">KARARGAH: Llama 3.1</option>
              </optgroup>
              <optgroup label="BULUT KÖPRÜLERİ (API)">
                <option value="gemini">GEMINI (1M Context Read)</option>
                <option value="groq">GROQ (Jet Hızında Emir)</option>
                <option value="openrouter">OPENROUTER (Yedek Ağı)</option>
              </optgroup>
            </select>
            <input value={aiGoal} onChange={e => setAiGoal(e.target.value)} placeholder="Ana Hedef (Örn: DB Yedekle ve Kontrol Et)" className="flex-1 bg-slate-950/80 border border-cyan-700/40 rounded px-2 py-2 text-[11px] text-white" />
          </div>
          <p className="text-[9px] text-slate-500 font-mono mb-2">Yapay zeka Taktiksel Atomizasyon ve Dual Validation (Çift Onay) süreçlerinden geçerek size askeri bir plan taslağı çıkarır.</p>
          <button onClick={() => void handleAiPlan()} disabled={aiLoading} className="w-full px-3 py-2 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-black tracking-widest text-[10px] rounded transition-all hover:bg-cyan-500/20">{aiLoading ? '⟳ KURMAY HESAPLIYOR...' : 'YAPAY ZEKA KURMAYINI ÇALIŞTIR'}</button>
        </div>
      </div>

      {hatStatus && (
        <div className="px-3 py-2 rounded text-[9px] font-mono bg-slate-900/80 border border-slate-700 text-cyan-400 animate-fade-in-up">
          {hatStatus}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
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
