import React, { useState } from 'react';
import { useTaskStore, Task } from '@/store/useTaskStore';
import { toast } from 'sonner';

export default function G0ApprovalPanel() {
  const { tasks, updateTaskStatus } = useTaskStore();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const pendingTasks = tasks.filter(t => t.status === 'onay_bekliyor');

  const handleAction = async (task: Task, action: 'APPROVE' | 'REJECT') => {
    setLoadingId(task.id);
    const targetStatus = action === 'APPROVE' ? 'beklemede' : 'iptal';
    
    try {
      const res = await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: task.id, status: targetStatus, updated_by: 'G0_COMMANDER' })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'İşlem Başarısız');
      
      updateTaskStatus(task.id, targetStatus);
      toast.success(action === 'APPROVE' ? 'Görev ONAYLANDI ve Ajan Kuyruğuna Atıldı' : 'Görev Kalıcı Olarak Çöpe Atıldı');
    } catch (err: any) {
      toast.error(`Sistem Hatası: ${err.message}`);
    } finally {
      setLoadingId(null);
    }
  };

  if (pendingTasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center glass-card border border-slate-700/30">
         <span className="text-4xl mb-4 opacity-50">🛡️</span>
         <h2 className="text-slate-400 font-black tracking-widest text-lg">G-0 TEMİZ</h2>
         <p className="text-[10px] text-slate-500 font-mono mt-2">Yönetici onayı bekleyen ajan operasyonu bulunmuyor.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-lg flex items-center justify-between shadow-lg shadow-amber-500/5">
         <div>
           <span className="text-amber-400 font-black tracking-[0.15em] text-[10px] block">G-0 İNSAN ONAY KATMANI (ECHO GATE)</span>
           <span className="text-slate-400 font-mono text-[9px] block">Ajanlar, bu mühür basılmadan Görev Sözleşmelerini yürütemezler.</span>
         </div>
         <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center border border-amber-500/40">
           <span className="text-amber-400 font-bold text-xs">{pendingTasks.length}</span>
         </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {pendingTasks.map(t => {
           const meta = t.metadata as any;
           const explanation = meta?.xai_sanity_explanation || 'Açıklama üretilemedi. Güvenlik Riski Yüksek olabilir.';
           
           return (
             <div key={t.id} className="glass-card border border-slate-700/50 p-4 relative overflow-hidden group hover:border-amber-500/30 transition-all">
                <div className="absolute top-0 left-0 w-1 h-full bg-amber-500/50 animate-pulse"></div>
                <div className="flex justify-between items-start mb-2">
                   <div>
                     <h3 className="text-slate-200 font-bold text-sm mb-1">{t.title}</h3>
                     <span className="font-mono text-[9px] text-slate-500 inline-block px-1.5 py-0.5 bg-slate-800 rounded">
                        [{t.task_code}] • PRIORITY: {t.priority.toUpperCase()}
                     </span>
                   </div>
                </div>
                
                <div className="bg-slate-900/70 p-3 rounded border border-slate-800 my-3 shadow-inner h-24 overflow-y-auto scrollbar-thin">
                   <span className="text-[8px] text-amber-400 font-black tracking-widest block mb-1">XAI (Anlama Motoru) RAPORU:</span>
                   <p className="text-[10px] text-slate-400 font-mono leading-relaxed">{explanation}</p>
                </div>

                <div className="flex gap-2 mt-4">
                   <button 
                      onClick={() => handleAction(t, 'APPROVE')} 
                      disabled={loadingId === t.id}
                      className="flex-1 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30 font-black tracking-widest text-[9px] py-2 rounded transition-all disabled:opacity-50 neon-glow-green"
                   >
                     {loadingId === t.id ? 'GÖNDERİLİYOR' : 'MÜHÜR VER'}
                   </button>
                   <button 
                      onClick={() => handleAction(t, 'REJECT')} 
                      disabled={loadingId === t.id}
                      className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-black tracking-widest text-[9px] py-2 rounded transition-all disabled:opacity-50"
                   >
                     {loadingId === t.id ? 'İPTAL...' : 'ÇÖPE AT'}
                   </button>
                </div>
             </div>
           );
        })}
      </div>
    </div>
  );
}
