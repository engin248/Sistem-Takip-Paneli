"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Users, Bot, Shield, Zap, Activity,
  Terminal, Search, Filter, ChevronRight,
  Target, Award, AlertCircle, RefreshCw,
  MoreVertical, Power, Settings, Plus,
  Cpu, MessageSquare, Briefcase
} from 'lucide-react';
import { toast } from 'sonner';

// ============================================================
// AGENT MANAGEMENT COMMAND CENTER (AMCC)
// ============================================================
// Bu bileşen, ANA SİSTEM ve ona bağlı tüm alt birimleri
// yönetmek, görev atamak ve performans izlemek için tasarlanmıştır.
// ============================================================

type AgentStatus = 'AKTİF' | 'BOŞTA' | 'MEŞGUL' | 'HATA';
type AgentTier = 'YAZILIM' | 'AR-GE' | 'WEB' | 'DENETİM';

interface Agent {
  id: string;
  codename: string;
  tier: AgentTier;
  status: AgentStatus;
  specialty: string;
  tasksCompleted: number;
  health: number; // 0-100
  lastAction: string;
  role?: string;
  rules?: string;
  directives?: string;
  memory?: string;
}

// MOCK_AGENTS kaldırıldı — Supabase'den gerçek veri çekiliyor
// Bağlantı koparsa fallback mock veri API'den gelir
function mapDbAgent(row: Record<string, unknown>): Agent {
  const statusMap: Record<string, AgentStatus> = {
    'AKTIF': 'AKTİF', 'AKTİF': 'AKTİF',
    'BOSTA': 'BOŞTA', 'BOŞTA': 'BOŞTA',
    'MESGUL': 'MEŞGUL', 'MEŞGUL': 'MEŞGUL',
    'HATA': 'HATA'
  };
  return {
    id: row.id as string,
    codename: row.codename as string,
    tier: row.tier as AgentTier,
    status: statusMap[row.status as string] || 'BOŞTA',
    specialty: row.specialty as string,
    tasksCompleted: (row.tasks_completed as number) || 0,
    health: (row.health as number) || 100,
    lastAction: (row.last_action as string) || 'Beklemede',
    role: (row.role as string) || '',
    rules: (row.rules as string) || '',
    directives: (row.directives as string) || '',
    memory: (row.memory as string) || '',
  };
}

const QUICK_ORDERS: Record<AgentTier, string[]> = {
  'YAZILIM': [
    "Frontend (Next.js) dizinini tara ve kullanılmayan (ölü) kodları raporla.",
    "Supabase üzerinde RLS kurallarını kontrol eden yeni bir API Route oluştur.",
    "Sistem arayüzündeki bileşenlerin yüklenme (render) performansını optimize et."
  ],
  'AR-GE': [
    "Kamera Bekçisi (Kamera_Alarm) loglarını analiz et ve son 24 saatin özetini çıkar.",
    "WhatsApp Bot'undan gelen işlenmemiş diyalogları anlamsal olarak kategorize et.",
    "Otonom görev dağıtımı için Llama-3 modeline uygun yeni prompt şablonları üret."
  ],
  'WEB': [
    "Hedef internet adresini (OSINT) tara ve sayfadaki tüm dış bağlantıları listele.",
    "Belirtilen dökümantasyon URL'sini oku ve RAG hafızasına vektör olarak kaydet.",
    "Açık kaynak istihbaratı ile yeni CVE (Güvenlik Açığı) kayıtlarını kontrol et."
  ],
  'DENETİM': [
    "Supabase veritabanı şemasını oku ve güvenlik/yetkilendirme zafiyetlerini test et.",
    "Aktif olarak çalışan diğer ajanların (Örn: MİMAR-X) son çıktılarını kalite kontrolünden geçir.",
    "Sunucudaki error_log dosyalarını incele ve tekrarlayan hataların çözüm yollarını sun."
  ]
};

export default function AgentPanel() {
  const [mounted, setMounted] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'supabase' | 'mock'>('mock');
  const [filter, setFilter] = useState<AgentTier | 'TÜMÜ'>('TÜMÜ');
  const [search, setSearch] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchAgents = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/agents');
      const json = await res.json();
      setAgents((json.agents || []).map(mapDbAgent));
      setDataSource(json.source === 'supabase' ? 'supabase' : 'mock');
    } catch (err) {
      console.error('Ajan yükleme hatası:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    fetchAgents();
  }, [fetchAgents]);

  // Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);

  // Form State
  const [formCodename, setFormCodename] = useState('');
  const [formTier, setFormTier] = useState<AgentTier>('YAZILIM');
  const [formSpecialty, setFormSpecialty] = useState('');
  const [formRole, setFormRole] = useState('');
  const [formRules, setFormRules] = useState('');
  const [formDirectives, setFormDirectives] = useState('');
  const [formMemory, setFormMemory] = useState('');

  // Order State
  const [activeOrderAgent, setActiveOrderAgent] = useState<Agent | null>(null);
  const [orderText, setOrderText] = useState('');
  const [orderPriority, setOrderPriority] = useState<'DÜŞÜK' | 'NORMAL' | 'KRİTİK'>('NORMAL');
  const [orderTaskType, setOrderTaskType] = useState<'TEKİL' | 'OTOMASYON' | 'PERİYODİK'>('TEKİL');
  const [orderAutonomy, setOrderAutonomy] = useState<'KONTROLLÜ' | 'OTONOM'>('KONTROLLÜ');

  // Chat State
  const [activeChatAgent, setActiveChatAgent] = useState<Agent | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{role: 'user'|'agent', text: string}[]>([]);

  const [isChatLoading, setIsChatLoading] = useState(false);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;
    
    const userMsg = chatInput.trim();
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatInput('');
    setIsChatLoading(true);
    
    try {
      const res = await fetch('/api/agents/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentCodename: activeChatAgent?.codename,
          agentTier: activeChatAgent?.tier,
          agentRole: activeChatAgent?.role,
          message: userMsg,
          history: chatMessages.slice(-6).map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text })),
        }),
      });
      const data = await res.json();
      setChatMessages(prev => [...prev, { role: 'agent', text: data.reply || 'Yanıt alınamadı.' }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'agent', text: 'Bağlantı hatası. Ollama çalışıyor mu?' }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const openNewAgentDrawer = () => {
    setEditingAgent(null);
    setFormCodename('');
    setFormTier('YAZILIM');
    setFormSpecialty('');
    setFormRole('');
    setFormRules('');
    setFormDirectives('');
    setFormMemory('');
    setIsDrawerOpen(true);
  };

  const openEditAgentDrawer = (agent: Agent) => {
    setEditingAgent(agent);
    setFormCodename(agent.codename);
    setFormTier(agent.tier);
    setFormSpecialty(agent.specialty);
    setFormRole(agent.role || '');
    setFormRules(agent.rules || '');
    setFormDirectives(agent.directives || '');
    setFormMemory(agent.memory || '');
    setIsDrawerOpen(true);
  };

  const saveAgent = async () => {
    if (!formCodename) {
      toast.error('Ajan kod adı boş olamaz!');
      return;
    }
    try {
      if (editingAgent) {
        // Supabase PATCH
        const res = await fetch(`/api/agents/${editingAgent.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ codename: formCodename, tier: formTier, specialty: formSpecialty, role: formRole, rules: formRules, directives: formDirectives, memory: formMemory }),
        });
        if (!res.ok) throw new Error(await res.text());
        toast.success(`${formCodename} Supabase'e güncellendi ✅`);
      } else {
        // Supabase POST
        const res = await fetch('/api/agents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ codename: formCodename, tier: formTier, specialty: formSpecialty, role: formRole, rules: formRules, directives: formDirectives, memory: formMemory }),
        });
        if (!res.ok) throw new Error(await res.text());
        toast.success(`${formCodename} kadroya eklendi ✅`);
      }
      setIsDrawerOpen(false);
      await fetchAgents(); // Listeyi yenile
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Kayıt hatası: ${msg}`);
    }
  };

  const toggleAgentPower = async (id: string) => {
    const agent = agents.find(a => a.id === id);
    if (!agent) return;
    const isAwake = agent.status !== 'BOŞTA';
    const newStatus = isAwake ? 'BOSTA' : 'AKTIF';
    const newAction = isAwake ? 'Uyku moduna geçti.' : 'Sistem başlatıldı, emir bekliyor.';
    // Optimistic UI güncelleme
    setAgents(prev => prev.map(a => a.id === id ? { ...a, status: isAwake ? 'BOŞTA' : 'AKTİF', lastAction: newAction } : a));
    try {
      await fetch(`/api/agents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, last_action: newAction }),
      });
    } catch (err) {
      console.error('Power toggle hatası:', err);
    }
  };

  const [isOrderLoading, setIsOrderLoading] = useState(false);

  const executeOrder = async () => {
    if (!orderText) { toast.error('Emir boş bırakılamaz!'); return; }
    setIsOrderLoading(true);
    try {
      const gorevMetni = `[${orderPriority}] [${orderTaskType}] [${orderAutonomy}] Ajan: ${activeOrderAgent?.codename} — ${orderText}`;
      const res = await fetch('/api/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: gorevMetni, agent: activeOrderAgent?.codename }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`✅ Görev Planlama Motoruna iletildi! ID: ${data.gorev_id || '—'}`);
      } else {
        toast.error(`❌ Görev reddedildi: ${data.message || data.error || 'Bilinmeyen hata'}`);
      }
      // Ajanın son aksiyonunu güncelle
      if (activeOrderAgent) {
        await fetch(`/api/agents/${activeOrderAgent.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'MESGUL', last_action: orderText.substring(0, 80) }),
        });
        await fetchAgents();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Bağlantı hatası: ${msg}`);
    } finally {
      setIsOrderLoading(false);
      setActiveOrderAgent(null);
      setOrderText('');
      setOrderPriority('NORMAL');
    }
  };

  const filteredAgents = agents.filter(a => {
    const matchFilter = filter === 'TÜMÜ' || a.tier === filter;
    const matchSearch = a.codename.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const handleRefresh = async () => {
    await fetchAgents();
    toast.success(`Ajan kadrosu Supabase'den senkronize edildi ✅ (${dataSource === 'supabase' ? 'Canlı Veri' : 'Mock Veri'})`);
  };

  const getStatusColor = (status: AgentStatus) => {
    switch (status) {
      case 'AKTİF': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'MEŞGUL': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'HATA': return 'text-red-400 bg-red-500/10 border-red-500/20';
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  return (
    <>
    <div className="flex flex-col h-full w-full bg-transparent animate-fade-in custom-scrollbar overflow-y-auto relative z-0">

      {/* ── HEADER: KOMUTA MERKEZİ ÜST BİLGİ ── */}
      <div className="p-8 border-b border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden bg-black/20">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-fuchsia-500/10 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="flex items-center gap-6 relative z-10">
          <div className="w-20 h-20 shrink-0 rounded-2xl bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center shadow-[0_0_30px_rgba(217,70,239,0.15)] relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500" />
            <Bot className="w-10 h-10 text-fuchsia-400 drop-shadow-[0_0_10px_rgba(217,70,239,0.8)] animate-pulse" />
          </div>
          <div className="flex flex-col justify-center gap-1.5">
            <h1 className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-fuchsia-100 to-fuchsia-400 tracking-[0.1em] md:tracking-[0.2em] uppercase">
              AJAN YÖNETİM MERKEZİ
            </h1>
            <div className="flex flex-wrap items-center gap-3 mt-1">
               <span className="flex items-center gap-2 text-[10px] font-black text-fuchsia-400 uppercase tracking-widest bg-fuchsia-500/10 px-3 py-1 rounded-full border border-fuchsia-500/20">
                 <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-500 animate-pulse" />
                 SİSTEM ÇEVRİMİÇİ
               </span>
               <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest flex items-center gap-1">
                 <span className="text-white font-bold">{agents.length}</span> OTONOM BİRİM GÖREVDE <span className="animate-[ping_1.5s_steps(2,start)_infinite] ml-0.5 text-fuchsia-500 font-bold">_</span>
               </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap md:flex-nowrap items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
          <div className="flex items-center gap-2 px-4 py-2 bg-black/20 border border-slate-800 rounded-lg w-full md:w-auto">
            <Search className="w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="AJAN ARA..."
              className="bg-transparent border-none outline-none text-[10px] font-bold text-white uppercase tracking-widest w-full md:w-32"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={handleRefresh}
              className="flex-1 md:flex-none justify-center px-4 py-2.5 rounded-lg bg-purple-600/10 border border-purple-500/20 text-purple-400 text-[10px] font-black uppercase tracking-widest hover:bg-purple-600 hover:text-white transition-all flex items-center gap-2 whitespace-nowrap"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              SENKRONİZE ET
            </button>
            <button
              onClick={openNewAgentDrawer}
              className="flex-1 md:flex-none justify-center px-4 py-2.5 rounded-lg bg-amber-600/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 hover:text-white transition-all flex items-center gap-2 whitespace-nowrap">
              <Plus className="w-3.5 h-3.5" />
              YENİ AJAN
            </button>
          </div>
        </div>
      </div>

      {/* ── İSTATİSTİK ŞERİDİ (YENİ CAM EFEKTLİ TASARIM) ── */}
      <div className="px-6 py-6 border-b border-white/5 grid grid-cols-2 md:grid-cols-4 gap-4 bg-black/20">
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex items-center gap-4 relative overflow-hidden group hover:border-white/20 transition-all">
          <div className="absolute right-0 top-0 w-16 h-16 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-all" />
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0 border border-white/5">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col z-10">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Toplam Kadro</span>
            <span className="text-xl font-black text-white leading-none">{agents.length} <span className="text-[10px] text-slate-500">BİRİM</span></span>
          </div>
        </div>

        <div className="bg-amber-500/5 backdrop-blur-md border border-amber-500/20 rounded-2xl p-4 flex items-center gap-4 relative overflow-hidden group hover:border-amber-500/30 transition-all shadow-[0_0_15px_rgba(245,158,11,0.05)]">
          <div className="absolute right-0 top-0 w-16 h-16 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all" />
          <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0 border border-amber-500/20">
            <Zap className="w-5 h-5 text-amber-400" />
          </div>
          <div className="flex flex-col z-10">
            <span className="text-[9px] font-black text-amber-500/70 uppercase tracking-widest mb-0.5">İcra Edilen Görev</span>
            <span className="text-xl font-black text-amber-400 leading-none">6.230<span className="text-[12px] text-amber-500/50">+</span></span>
          </div>
        </div>

        <div className="bg-fuchsia-500/5 backdrop-blur-md border border-fuchsia-500/20 rounded-2xl p-4 flex items-center gap-4 relative overflow-hidden group hover:border-fuchsia-500/30 transition-all shadow-[0_0_15px_rgba(217,70,239,0.05)]">
          <div className="absolute right-0 top-0 w-16 h-16 bg-fuchsia-500/10 rounded-full blur-2xl group-hover:bg-fuchsia-500/20 transition-all" />
          <div className="w-10 h-10 rounded-full bg-fuchsia-500/10 flex items-center justify-center shrink-0 border border-fuchsia-500/20">
            <Activity className="w-5 h-5 text-fuchsia-400" />
          </div>
          <div className="flex flex-col z-10">
            <span className="text-[9px] font-black text-fuchsia-500/70 uppercase tracking-widest mb-0.5">Genel Performans</span>
            <span className="text-xl font-black text-fuchsia-400 leading-none">%98.4</span>
          </div>
        </div>

        <div className="bg-rose-500/5 backdrop-blur-md border border-rose-500/20 rounded-2xl p-4 flex items-center gap-4 relative overflow-hidden group hover:border-rose-500/30 transition-all shadow-[0_0_15px_rgba(244,63,94,0.05)]">
          <div className="absolute right-0 top-0 w-16 h-16 bg-rose-500/10 rounded-full blur-2xl group-hover:bg-rose-500/20 transition-all" />
          <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center shrink-0 border border-rose-500/20">
            <Shield className="w-5 h-5 text-rose-400" />
          </div>
          <div className="flex flex-col z-10">
            <span className="text-[9px] font-black text-rose-500/70 uppercase tracking-widest mb-0.5">L2 Otonom Denetim</span>
            <span className="text-xl font-black text-rose-400 leading-none">SIKI</span>
          </div>
        </div>
      </div>

      {/* ── FİLTRE BARI (YENİ PİLL TASARIMI) ── */}
      <div className="px-6 py-4 border-b border-white/5 flex gap-3 overflow-x-auto custom-scrollbar bg-black/40 backdrop-blur-md">
        {(['TÜMÜ', 'YAZILIM', 'AR-GE', 'WEB', 'DENETİM'] as const).map(f => {
          const isSelected = filter === f;
          
          let colorClass = 'text-white border-white bg-white/10 shadow-[0_0_15px_rgba(255,255,255,0.2)]';
          if (isSelected) {
            if (f === 'YAZILIM') colorClass = 'text-fuchsia-400 border-fuchsia-400 bg-fuchsia-500/10 shadow-[0_0_15px_rgba(217,70,239,0.3)]';
            if (f === 'AR-GE') colorClass = 'text-purple-400 border-purple-400 bg-purple-500/10 shadow-[0_0_15px_rgba(168,85,247,0.3)]';
            if (f === 'WEB') colorClass = 'text-amber-400 border-amber-400 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.3)]';
            if (f === 'DENETİM') colorClass = 'text-rose-400 border-rose-400 bg-rose-500/10 shadow-[0_0_15px_rgba(244,63,94,0.3)]';
          }

          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-6 py-2.5 rounded-full text-[10px] font-black tracking-[0.2em] uppercase border transition-all duration-300 flex items-center gap-2 ${
                isSelected 
                  ? colorClass
                  : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:text-white hover:border-white/20'
              }`}
            >
              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
              {f}
            </button>
          );
        })}
      </div>

      {/* ── AJAN KARTLARI GRİD (ROBOTİK TASARIM) ── */}
      <div className="flex-1 p-6 grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6 bg-transparent">
        {filteredAgents.map(agent => {
          
          // Ajan Renk Teması
          let agentColor = 'slate';
          if (agent.tier === 'YAZILIM') agentColor = 'fuchsia';
          if (agent.tier === 'DENETİM') agentColor = 'rose';
          if (agent.tier === 'WEB') agentColor = 'amber';
          if (agent.tier === 'AR-GE') agentColor = 'purple';

          return (
            <div key={agent.id} className={`group relative bg-black/40 backdrop-blur-xl border ${agent.status === 'MEŞGUL' ? `border-${agentColor}-500/50 shadow-[0_0_30px_rgba(0,0,0,0.5)] shadow-${agentColor}-500/10` : 'border-white/10 hover:border-white/20'} transition-all duration-500 p-6 flex flex-col gap-6 overflow-hidden rounded-3xl`}>
              
              {/* Status Indicator Bar */}
              <div className={`absolute top-0 left-0 w-full h-1 ${agent.status === 'MEŞGUL' ? `bg-${agentColor}-500 animate-pulse` : agent.status === 'AKTİF' ? `bg-${agentColor}-400/50` : 'bg-slate-700'}`} />

              <div className="flex items-start gap-6">
                {/* ── ROBOT CORE (AVATAR) ── */}
                <div className="shrink-0 flex flex-col items-center gap-3">
                  <div className={`relative w-20 h-20 rounded-full flex items-center justify-center bg-black/50 border border-white/5`}>
                    
                    {agent.status === 'MEŞGUL' && (
                      <>
                        <div className={`absolute inset-0 rounded-full border-t-4 border-${agentColor}-500 animate-spin duration-700`} />
                        <div className={`absolute inset-0 rounded-full border-b-4 border-${agentColor}-400/50 animate-[spin_2s_linear_infinite_reverse]`} />
                        <div className={`w-10 h-10 bg-${agentColor}-500 rounded-full animate-pulse blur-[4px]`} />
                        <div className={`absolute w-8 h-8 bg-white rounded-full opacity-40 blur-[2px] animate-ping`} />
                        <Activity className={`absolute w-6 h-6 text-white z-10 animate-pulse`} />
                      </>
                    )}

                    {agent.status === 'AKTİF' && (
                      <>
                        <div className={`absolute inset-0 rounded-full border-2 border-${agentColor}-400/30`} />
                        <div className={`w-10 h-10 bg-${agentColor}-400/80 rounded-full animate-[pulse_3s_ease-in-out_infinite] shadow-[0_0_20px_currentColor] text-${agentColor}-500`} />
                        <Shield className={`absolute w-5 h-5 text-black z-10`} />
                      </>
                    )}

                    {agent.status === 'BOŞTA' && (
                      <>
                        <div className={`absolute inset-0 rounded-full border-2 border-slate-700 border-dashed`} />
                        <div className={`w-8 h-8 bg-slate-700 rounded-full opacity-50`} />
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-slate-800 rounded-full flex items-center justify-center text-[10px] text-slate-500 border border-slate-700 font-bold">zZ</div>
                      </>
                    )}
                  </div>
                  
                  <div className={`px-3 py-1 rounded-full text-[9px] font-black tracking-widest ${getStatusColor(agent.status)}`}>
                    {agent.status}
                  </div>
                </div>

                {/* ── INFO & STATS ── */}
                <div className="flex-1 min-w-0 flex flex-col gap-3">
                  <div>
                    <h3 className="text-xl font-black text-white tracking-widest uppercase truncate">{agent.codename}</h3>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-md bg-${agentColor}-500/10 border border-${agentColor}-500/20 text-[9px] font-black tracking-widest text-${agentColor}-400 uppercase`}>
                        {agent.tier} BİRİMİ
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="bg-white/5 rounded-xl p-3 border border-white/5 flex flex-col justify-center">
                      <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-1">Yapay Zeka Modeli</span>
                      <span className="text-[11px] font-mono text-white truncate">{agent.specialty}</span>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3 border border-white/5 flex flex-col justify-center">
                      <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-1">Görev Başarısı</span>
                      <span className={`text-[11px] font-mono font-bold text-${agentColor}-400`}>{agent.tasksCompleted} İŞLEM</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── DYNAMIC DIALOGUE & ACTION ── */}
              <div className="mt-auto space-y-4">
                
                {/* Core Integrity */}
                <div className="space-y-1.5 px-1">
                  <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-widest">
                    <span className="text-slate-500 flex items-center gap-1.5"><Activity className="w-3 h-3" /> Çekirdek Bütünlüğü</span>
                    <span className={agent.status === 'BOŞTA' ? 'text-slate-700' : 'text-white'}>%{agent.health}</span>
                  </div>
                  <div className="h-1 bg-black/50 rounded-full overflow-hidden border border-white/5">
                    <div className={`h-full ${agent.status === 'BOŞTA' ? 'bg-slate-800' : `bg-${agentColor}-500 shadow-[0_0_10px_currentColor]`} transition-all duration-1000 relative`} style={{ width: `${agent.health}%` }}>
                       <div className="absolute top-0 right-0 w-4 h-full bg-white/50 blur-[2px]" />
                    </div>
                  </div>
                </div>

                {/* Speech Bubble */}
                <div className={`relative bg-black/60 rounded-2xl p-4 border ${agent.status === 'MEŞGUL' ? `border-${agentColor}-500/50` : agent.status === 'AKTİF' ? 'border-white/10' : 'border-slate-800/50'} flex flex-col gap-2 min-h-[80px] shadow-inner`}>
                  
                  {/* Speaker indicator */}
                  <div className="flex items-center gap-2 mb-1">
                     <MessageSquare className={`w-3.5 h-3.5 ${agent.status === 'BOŞTA' ? 'text-slate-700' : `text-${agentColor}-400`}`} />
                     <span className={`text-[10px] font-black tracking-widest uppercase ${agent.status === 'BOŞTA' ? 'text-slate-700' : `text-${agentColor}-400`}`}>
                       {agent.codename} DİYOR Kİ:
                     </span>
                  </div>

                  <p className={`text-[12px] font-medium leading-relaxed italic line-clamp-2 ${agent.status === 'MEŞGUL' ? 'text-white' : agent.status === 'AKTİF' ? 'text-slate-300' : 'text-slate-600'}`}>
                    "{agent.status === 'MEŞGUL' ? agent.lastAction : agent.status === 'AKTİF' ? 'Sistemlerim devrede. Yeni emirlerinizi bekliyorum komutanım.' : 'Zzz... Uyku modundayım. Uyandırmak için gücü açın.'}"
                  </p>

                  {/* Animated voice wave if busy */}
                  {agent.status === 'MEŞGUL' && (
                    <div className="absolute bottom-4 right-4 flex items-end gap-0.5 h-3">
                      <div className={`w-1 bg-${agentColor}-500 animate-[pulse_0.8s_ease-in-out_infinite] h-full`} />
                      <div className={`w-1 bg-${agentColor}-500 animate-[pulse_1.2s_ease-in-out_infinite_reverse] h-2/3`} />
                      <div className={`w-1 bg-${agentColor}-500 animate-[pulse_0.9s_ease-in-out_infinite] h-full`} />
                      <div className={`w-1 bg-${agentColor}-500 animate-[pulse_1.5s_ease-in-out_infinite_reverse] h-1/2`} />
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  {/* Power Toggle */}
                  <button 
                    onClick={() => toggleAgentPower(agent.id)}
                    className={`w-12 h-12 rounded-2xl border flex items-center justify-center transition-all shrink-0 ${
                      agent.status !== 'BOŞTA' 
                      ? `bg-${agentColor}-500/20 border-${agentColor}-500 text-${agentColor}-400 shadow-[0_0_15px_currentColor]` 
                      : 'bg-black/50 border-slate-800 text-slate-600 hover:text-white hover:border-slate-600'
                    }`}
                    title={agent.status !== 'BOŞTA' ? "Uyku Moduna Al" : "Sistemi Uyandır"}
                  >
                    <Power className="w-5 h-5" />
                  </button>

                  <button 
                    onClick={() => agent.status !== 'BOŞTA' ? setActiveOrderAgent(agent) : null}
                    disabled={agent.status === 'BOŞTA'}
                    className={`flex-1 h-12 rounded-2xl font-black uppercase text-[11px] tracking-widest transition-all ${
                      agent.status === 'MEŞGUL' 
                      ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30 hover:bg-amber-500 hover:text-white' 
                      : agent.status === 'AKTİF'
                      ? 'bg-white/5 text-white border border-white/10 hover:bg-white hover:text-black shadow-[0_0_10px_rgba(255,255,255,0.05)]'
                      : 'bg-black/40 text-slate-700 border border-slate-800 cursor-not-allowed'
                    }`}>
                    {agent.status === 'MEŞGUL' ? 'MÜDAHALE ET' : 'GÖREV ATA'}
                  </button>

                  <button 
                    onClick={() => {
                      if (agent.status !== 'BOŞTA') {
                        setActiveChatAgent(agent);
                        setChatMessages([{ role: 'agent', text: `Merhaba komutanım. Sistemlerim çevrimiçi. Nasıl yardımcı olabilirim?` }]);
                      }
                    }}
                    disabled={agent.status === 'BOŞTA'}
                    className={`w-12 h-12 rounded-2xl border flex items-center justify-center transition-all shrink-0 ${
                      agent.status !== 'BOŞTA'
                      ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500 hover:text-white'
                      : 'bg-black/40 border-slate-800 text-slate-600 cursor-not-allowed'
                    }`}
                    title="Ajan ile Sohbet Et"
                  >
                    <MessageSquare className="w-5 h-5" />
                  </button>

                  <button 
                    onClick={() => openEditAgentDrawer(agent)}
                    className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-all shrink-0">
                    <Settings className="w-5 h-5" />
                  </button>
                </div>
              </div>

            </div>
          );
        })}
      </div>
    </div> {/* END OF SCROLLABLE CONTAINER */}
      
      {mounted && createPortal(
        <>
          {/* ── AGENT MODAL (YENİ EKLE / DÜZENLE) ── */}
      <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-500 ${isDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className={`absolute inset-0 bg-black/80 backdrop-blur-xl transition-opacity duration-500 ${isDrawerOpen ? 'opacity-100' : 'opacity-0'}`} onClick={() => setIsDrawerOpen(false)} />
        <div className={`relative w-full max-w-[900px] max-h-[90vh] bg-black/40 backdrop-blur-3xl border border-rose-500/30 rounded-3xl shadow-[0_0_80px_rgba(244,63,94,0.15)] flex flex-col transform transition-all duration-500 ease-out overflow-hidden ${isDrawerOpen ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-10 opacity-0'}`}>
          
          <div className="absolute top-0 right-0 w-96 h-96 bg-rose-500/10 blur-[100px] rounded-full pointer-events-none" />

          {/* MODAL HEADER */}
          <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20 shadow-[0_0_20px_rgba(244,63,94,0.2)]">
                <Settings className="w-6 h-6 text-rose-400 animate-[spin_4s_linear_infinite]" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white tracking-widest uppercase">
                  {editingAgent ? 'AJAN GÜNCELLEME' : 'YENİ AJAN OLUŞTUR'}
                </h2>
                <p className="text-[10px] font-mono text-rose-400 uppercase tracking-widest mt-0.5">Ajan Ayarları Paneli</p>
              </div>
            </div>
            <button onClick={() => setIsDrawerOpen(false)} className="text-slate-500 hover:text-white w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors">
              <Plus className="w-6 h-6 rotate-45" />
            </button>
          </div>

          <div className="flex-1 p-8 overflow-y-auto custom-scrollbar relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* SOL SÜTUN: TEMEL KİMLİK */}
                <div className="space-y-6">
                <div className="pb-3 border-b border-white/5">
                    <h3 className="text-sm font-black text-rose-400 tracking-widest uppercase flex items-center gap-2">
                    <Cpu className="w-5 h-5" />
                    Temel Bilgiler
                    </h3>
                    <p className="text-[11px] font-mono text-slate-500 mt-1.5">Ajanın kimliği ve yeteneklerini buradan ayarlayabilirsiniz.</p>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-400 tracking-widest uppercase">Ajan Adı</label>
                    <input 
                        type="text" 
                        value={formCodename}
                        onChange={e => setFormCodename(e.target.value)}
                        placeholder="Örn: MİMAR-X"
                        className="w-full bg-black/40 border border-white/10 rounded-xl text-white p-4 text-sm font-bold uppercase focus:border-rose-500/50 outline-none transition-colors shadow-inner"
                    />
                    <p className="text-[10px] text-slate-600 font-mono leading-tight">Sistemin ajanı tanıyacağı kısa isim.</p>
                    </div>

                    <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-400 tracking-widest uppercase">Yapay Zeka Modeli</label>
                    <select 
                        value={formSpecialty}
                        onChange={e => setFormSpecialty(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl text-white p-4 text-sm font-semibold focus:border-rose-500/50 outline-none transition-colors appearance-none shadow-inner [&>option]:bg-slate-900"
                    >
                        <option value="" disabled>Model Seçiniz</option>
                        <option value="Claude-3.5-Sonnet">Claude 3.5 Sonnet (Kod/Mimari)</option>
                        <option value="GPT-4o">GPT-4o (Genel Analiz/Web)</option>
                        <option value="GPT-4o-Mini">GPT-4o-Mini (Hızlı İşlemler)</option>
                        <option value="Ollama-Llama3">Lokal: Ollama Llama-3 (Gizli Veri)</option>
                    </select>
                    <p className="text-[10px] text-slate-600 font-mono leading-tight">Ajanın zekasını ve hızını belirleyen model.</p>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-400 tracking-widest uppercase">Departman / Alan</label>
                    <div className="grid grid-cols-2 gap-3">
                    {(['YAZILIM', 'AR-GE', 'WEB', 'DENETİM'] as const).map(tier => (
                        <button
                        key={tier}
                        onClick={() => setFormTier(tier)}
                        className={`py-3.5 px-2 rounded-xl text-[11px] font-black tracking-widest uppercase border transition-all ${formTier === tier ? 'bg-rose-500/20 border-rose-500 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.2)]' : 'bg-black/40 border-white/10 text-slate-500 hover:border-white/20 hover:text-white'}`}
                        >
                        {tier}
                        </button>
                    ))}
                    </div>
                </div>
                </div>

                {/* SAĞ SÜTUN: LLM MİMARİSİ */}
                <div className="space-y-6">
                <div className="pb-3 border-b border-white/5">
                    <h3 className="text-sm font-black text-fuchsia-400 tracking-widest uppercase flex items-center gap-2">
                    <Bot className="w-5 h-5" />
                    Talimatlar ve Kurallar
                    </h3>
                    <p className="text-[11px] font-mono text-slate-500 mt-1.5">Ajanın nasıl davranacağını ve işleri nasıl çözeceğini belirler.</p>
                </div>

                <div className="space-y-2">
                    <label className="text-[11px] font-bold text-fuchsia-400 tracking-widest uppercase flex items-center justify-between">
                    <span>Sistem Görevi</span>
                    </label>
                    <textarea 
                    value={formRole}
                    onChange={e => setFormRole(e.target.value)}
                    placeholder="[ÖRN]: Sen bir yazılım asistanısın. Gelen talepleri analiz edersin..."
                    className="w-full h-28 bg-black/40 border border-fuchsia-900/40 rounded-xl text-fuchsia-100 p-4 text-[13px] font-mono leading-relaxed focus:border-fuchsia-500 outline-none transition-all resize-none custom-scrollbar shadow-inner"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-[11px] font-bold text-red-400 tracking-widest uppercase flex items-center justify-between">
                    <span>Yasaklar ve Sınırlar</span>
                    </label>
                    <textarea 
                    value={formRules}
                    onChange={e => setFormRules(e.target.value)}
                    placeholder="[ÖRN]: Dosyaları asla silme, emin olmadığın kodu yazma..."
                    className="w-full h-28 bg-black/40 border border-red-900/40 rounded-xl text-red-100 p-4 text-[13px] font-mono leading-relaxed focus:border-red-500 outline-none transition-all resize-none custom-scrollbar shadow-inner"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-[11px] font-bold text-amber-400 tracking-widest uppercase flex items-center justify-between">
                    <span>Çalışma Planı (Adım Adım)</span>
                    </label>
                    <textarea 
                    value={formDirectives}
                    onChange={e => setFormDirectives(e.target.value)}
                    placeholder="1. Dosyayı oku... 2. Hatayı bul... 3. Düzelt..."
                    className="w-full h-28 bg-black/40 border border-amber-900/40 rounded-xl text-amber-100 p-4 text-[13px] font-mono leading-relaxed focus:border-amber-500 outline-none transition-all resize-none custom-scrollbar shadow-inner"
                    />
                </div>
                </div>

            </div>
          </div>

          <div className="p-6 border-t border-white/5 bg-white/5 flex gap-4 relative z-10">
            <button 
              onClick={() => setIsDrawerOpen(false)}
              className="flex-1 py-4 rounded-xl bg-white/5 border border-white/10 text-slate-400 text-xs font-black tracking-widest uppercase hover:text-white hover:bg-white/10 transition-colors"
            >
              İPTAL
            </button>
            <button 
              onClick={saveAgent}
              className="flex-1 py-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black tracking-widest uppercase transition-all shadow-[0_0_20px_rgba(225,29,72,0.4)]"
            >
              {editingAgent ? 'GÜNCELLE' : 'AJANI OLUŞTUR'}
            </button>
          </div>

        </div>
      </div>

      {/* ── YENİ: GELİŞMİŞ GÖREV ATAMA MODAL ── */}
      <div className={`fixed inset-0 z-[60] flex items-center justify-center p-4 transition-all duration-500 ${activeOrderAgent ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className={`absolute inset-0 bg-black/80 backdrop-blur-xl transition-opacity duration-500 ${activeOrderAgent ? 'opacity-100' : 'opacity-0'}`} onClick={() => setActiveOrderAgent(null)} />
        
        <div className={`relative w-full max-w-[900px] max-h-[90vh] bg-black/40 backdrop-blur-3xl border border-rose-500/30 rounded-3xl shadow-[0_0_80px_rgba(244,63,94,0.15)] flex flex-col transform transition-all duration-500 ease-out overflow-hidden ${activeOrderAgent ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-10 opacity-0'}`}>
          
          {/* HEADER */}
          <div className="p-6 border-b border-white/5 bg-black/20 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.15)]">
                <Terminal className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white tracking-widest uppercase">
                  YENİ GÖREV ATA
                </h2>
                <p className="text-[11px] font-mono text-rose-400 uppercase tracking-widest mt-0.5">
                  Hedef Ajan: <span className="text-white font-bold">{activeOrderAgent?.codename}</span> — {activeOrderAgent?.tier} Departmanı
                </p>
              </div>
            </div>
            <button onClick={() => setActiveOrderAgent(null)} className="text-slate-500 hover:text-white w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors">
              <Plus className="w-6 h-6 rotate-45" />
            </button>
          </div>

          {/* BODY */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* SOL SÜTUN: YAPILANDIRMA */}
              <div className="space-y-6">
                <div className="pb-3 border-b border-white/5">
                    <h3 className="text-sm font-black text-rose-400 tracking-widest uppercase flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Görev Yapılandırması
                    </h3>
                    <p className="text-[11px] font-mono text-slate-500 mt-1.5">Görevin çalışma tipini ve yetkilerini belirleyin.</p>
                </div>

                <div className="space-y-3">
                  <label className="text-[11px] font-bold text-slate-400 tracking-widest uppercase">Görev Tipi</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['TEKİL', 'OTOMASYON', 'PERİYODİK'] as const).map(type => (
                      <button
                        key={type}
                        onClick={() => setOrderTaskType(type)}
                        className={`py-3 px-2 rounded-xl text-[10px] font-black tracking-widest uppercase border transition-all ${
                          orderTaskType === type 
                            ? 'bg-rose-500/20 border-rose-500 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.2)]' 
                            : 'bg-black/40 border-white/10 text-slate-500 hover:border-white/20 hover:text-white'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-600 font-mono leading-tight">
                    {orderTaskType === 'TEKİL' && 'Görevi sadece bir kez çalıştırır ve bitirir.'}
                    {orderTaskType === 'OTOMASYON' && 'Diğer ajanlarla zincirleme bağlanabilecek bir iş akışı başlatır.'}
                    {orderTaskType === 'PERİYODİK' && 'Belirtilen zaman aralıklarında otomatik olarak tekrarlar.'}
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="text-[11px] font-bold text-slate-400 tracking-widest uppercase">Otonomi (Yetki) Seviyesi</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['KONTROLLÜ', 'OTONOM'] as const).map(lvl => (
                      <button
                        key={lvl}
                        onClick={() => setOrderAutonomy(lvl)}
                        className={`py-3 px-2 rounded-xl text-[11px] font-black tracking-widest uppercase border transition-all ${
                          orderAutonomy === lvl 
                            ? 'bg-amber-500/20 border-amber-500 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]' 
                            : 'bg-black/40 border-white/10 text-slate-500 hover:border-white/20 hover:text-white'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-600 font-mono leading-tight">
                    {orderAutonomy === 'KONTROLLÜ' && 'Ajan kritik işlemlerde (örn: DB yazma) kullanıcı onayı bekler.'}
                    {orderAutonomy === 'OTONOM' && 'Ajan inisiyatif alarak görevi uçtan uca kendi başına tamamlar.'}
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="text-[11px] font-bold text-slate-400 tracking-widest uppercase">Aciliyet (Öncelik)</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['DÜŞÜK', 'NORMAL', 'KRİTİK'] as const).map(p => (
                      <button
                        key={p}
                        onClick={() => setOrderPriority(p)}
                        className={`py-2 rounded-xl text-[10px] font-black tracking-widest uppercase border transition-all ${
                          orderPriority === p 
                            ? p === 'KRİTİK' ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-rose-500/20 border-rose-500 text-rose-400'
                            : 'bg-black/40 border-white/10 text-slate-500 hover:border-white/20 hover:text-white'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              {/* SAĞ SÜTUN: DİREKTİF */}
              <div className="space-y-6">
                <div className="pb-3 border-b border-white/5">
                    <h3 className="text-sm font-black text-fuchsia-400 tracking-widest uppercase flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Operasyonel Direktif
                    </h3>
                    <p className="text-[11px] font-mono text-slate-500 mt-1.5">Ajanın tam olarak ne yapmasını istediğinizi yazın.</p>
                </div>

                <div className="space-y-2">
                  <textarea 
                    value={orderText}
                    onChange={e => setOrderText(e.target.value)}
                    placeholder={`${activeOrderAgent?.codename} için emir girin...`}
                    className="w-full h-40 bg-black/40 border border-fuchsia-900/40 rounded-xl text-fuchsia-100 p-4 text-[13px] font-mono leading-relaxed focus:border-fuchsia-500 outline-none transition-all resize-none custom-scrollbar shadow-inner"
                  />
                </div>

                {/* HIZLI ŞABLONLAR */}
                {activeOrderAgent && (
                  <div className="space-y-3 pt-2">
                    <label className="text-[11px] font-bold text-slate-400 tracking-widest uppercase flex items-center gap-2">
                      Hızlı Görev Şablonları
                    </label>
                    <div className="flex flex-col gap-2">
                      {QUICK_ORDERS[activeOrderAgent.tier].map((order, idx) => (
                        <button
                          key={idx}
                          onClick={() => setOrderText(order)}
                          className="text-left p-3 rounded-xl bg-black/40 border border-white/5 hover:border-rose-500/30 hover:bg-rose-500/5 text-[11px] font-mono text-slate-400 hover:text-rose-300 transition-all flex items-start gap-2 group shadow-inner"
                        >
                          <span className="text-rose-600 group-hover:text-rose-400 mt-0.5">&gt;</span>
                          <span className="leading-relaxed">{order}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* FOOTER */}
          <div className="p-6 border-t border-white/5 bg-white/5 flex gap-4 relative z-10">
            <button 
              onClick={() => setActiveOrderAgent(null)}
              className="flex-1 py-4 rounded-xl bg-white/5 border border-white/10 text-slate-400 text-xs font-black tracking-widest uppercase hover:text-white hover:bg-white/10 transition-colors"
            >
              İPTAL
            </button>
            <button 
              onClick={executeOrder}
              className={`flex-1 py-4 rounded-xl text-white text-xs font-black tracking-widest uppercase transition-all shadow-[0_0_20px_rgba(225,29,72,0.4)] flex items-center justify-center gap-2 ${
                orderPriority === 'KRİTİK' ? 'bg-red-600 hover:bg-red-500' : 'bg-rose-600 hover:bg-rose-500'
              }`}
            >
              <Terminal className="w-4 h-4" />
              EMRİ İŞLEME AL
            </button>
          </div>

        </div>
      </div>
      
      {/* ── SOHBET (CHAT) MODAL ── */}
      <div className={`fixed inset-0 z-[70] flex items-center justify-center p-4 transition-all duration-300 ${activeChatAgent ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setActiveChatAgent(null)} />
        
        <div className={`relative w-full max-w-[500px] h-[600px] bg-black/60 backdrop-blur-3xl border border-cyan-500/30 rounded-3xl shadow-[0_0_50px_rgba(6,182,212,0.15)] flex flex-col transform transition-transform duration-300 ${activeChatAgent ? 'scale-100 translate-y-0' : 'scale-95 translate-y-10'}`}>
          
          <div className="p-4 border-b border-white/5 bg-white/5 rounded-t-3xl flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 rounded-xl">
                <Bot className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-[13px] font-black text-white tracking-widest uppercase">
                  {activeChatAgent?.codename} <span className="text-cyan-400">İLE SOHBET</span>
                </h2>
                <p className="text-[9px] font-mono text-cyan-500/70 mt-0.5">Uçtan Uca Şifreli Kanaldan Bağlanıldı</p>
              </div>
            </div>
            <button onClick={() => setActiveChatAgent(null)} className="text-slate-500 hover:text-white w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors">
              <Plus className="w-5 h-5 rotate-45" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-[12px] leading-relaxed font-medium ${
                  msg.role === 'user' 
                  ? 'bg-rose-600 text-white rounded-br-none shadow-[0_0_15px_rgba(225,29,72,0.3)]' 
                  : 'bg-white/10 text-cyan-100 rounded-bl-none border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleSendMessage} className="p-4 border-t border-white/5 bg-black/40 rounded-b-3xl shrink-0 flex gap-2">
            <input 
              type="text" 
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Mesajınızı yazın..." 
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-colors"
            />
            <button 
              type="submit"
              disabled={!chatInput.trim()}
              className="w-12 h-12 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl flex items-center justify-center transition-colors shrink-0"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </form>

        </div>
      </div>
      </>,
      document.body
    )}

    </>
  );
}


