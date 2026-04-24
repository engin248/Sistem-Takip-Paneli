// @ts-nocheck
"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  BrainCircuit, RefreshCw, Terminal, Eye, Users,
  Radar, Search, FileText, Paperclip, ImageIcon,
  Trash2, ArrowUpRight, Cpu, Send, Wifi, Mic
} from 'lucide-react';
import AgentAuthorityBadge from '../shared/AgentAuthorityBadge';

// ── GERÇEK OLLAMA MODELLERİ — 52 model (26 orijinal + 26 klon) ──
const AI_MODELLERI = [
  // ── ORİJİNAL MODELLER ──
  { ad: 'deepseek-coder-v2', rol: 'MİMAR',       gpu: '8.9 GB', tip: 'orijinal' },
  { ad: 'mistral',           rol: 'DENETÇİ',     gpu: '4.4 GB', tip: 'orijinal' },
  { ad: 'qwen2.5',           rol: 'ANALİZCİ',    gpu: '4.7 GB', tip: 'orijinal' },
  { ad: 'llama3.1:8b',       rol: 'KURMAY',      gpu: '4.9 GB', tip: 'orijinal' },
  { ad: 'gemma2:9b',         rol: 'GÖLGE',       gpu: '5.4 GB', tip: 'orijinal' },
  { ad: 'phi3',              rol: 'HIZLI',       gpu: '2.2 GB', tip: 'orijinal' },
  { ad: 'phi4-mini',         rol: 'AKIL',        gpu: '2.3 GB', tip: 'orijinal' },
  { ad: 'codellama',         rol: 'KOD',         gpu: '3.8 GB', tip: 'orijinal' },
  { ad: 'starcoder2',        rol: 'KOD-2',       gpu: '1.7 GB', tip: 'orijinal' },
  { ad: 'llava',             rol: 'GÖRSEL',      gpu: '4.7 GB', tip: 'orijinal' },
  { ad: 'command-r',         rol: 'KOMUTA',      gpu: '18 GB',  tip: 'orijinal' },
  { ad: 'nomic-embed-text',  rol: 'ARAMA',       gpu: '274 MB', tip: 'orijinal' },
  { ad: 'tinyllama',         rol: 'HABER',       gpu: '637 MB', tip: 'orijinal' },
  { ad: 'qwen3:0.6b',        rol: 'DÜŞÜNÜR-1',   gpu: '522 MB', tip: 'orijinal' },
  { ad: 'qwen2:0.5b',        rol: 'DÜŞÜNÜR-2',   gpu: '352 MB', tip: 'orijinal' },
  { ad: 'llama3.2:1b',       rol: 'HAFİF-1',     gpu: '1.3 GB', tip: 'orijinal' },
  { ad: 'gemma3:1b',         rol: 'HAFİF-2',     gpu: '815 MB', tip: 'orijinal' },
  { ad: 'gemma3:4b',         rol: 'GOOGLE',      gpu: '3.3 GB', tip: 'orijinal' },
  { ad: 'qwen2.5-coder:3b',  rol: 'KOD-3',      gpu: '1.9 GB', tip: 'orijinal' },
  { ad: 'deepseek-r1:7b',    rol: 'MANTIK',      gpu: '4.7 GB', tip: 'orijinal' },
  { ad: 'minicpm-v',         rol: 'GÖRSEL-2',    gpu: '5.5 GB', tip: 'orijinal' },
  { ad: 'mistral-nemo',      rol: 'UZUN-METİN',  gpu: '7.1 GB', tip: 'orijinal' },
  { ad: 'llama3:8b',         rol: 'META',        gpu: '4.7 GB', tip: 'orijinal' },
  { ad: 'llama3.2-vision:11b', rol: 'VİZYON',   gpu: '7.8 GB', tip: 'orijinal' },
  { ad: 'phi4',              rol: 'MİCROSOFT',   gpu: '9.1 GB', tip: 'orijinal' },
  { ad: 'qwen3.5:4b',        rol: 'ÇOKLU',       gpu: '3.4 GB', tip: 'orijinal' },
  // ── KLON MODELLER ──
  { ad: 'klon-deepseek-coder-v2-latest', rol: 'MİMAR-K',      gpu: '8.9 GB', tip: 'klon' },
  { ad: 'klon-mistral-latest',           rol: 'DENETÇİ-K',    gpu: '4.4 GB', tip: 'klon' },
  { ad: 'klon-qwen2.5-latest',           rol: 'ANALİZCİ-K',   gpu: '4.7 GB', tip: 'klon' },
  { ad: 'klon-llama3.1-8b',             rol: 'KURMAY-K',     gpu: '4.9 GB', tip: 'klon' },
  { ad: 'klon-gemma2-9b',               rol: 'GÖLGE-K',      gpu: '5.4 GB', tip: 'klon' },
  { ad: 'klon-phi3-latest',             rol: 'HIZLI-K',      gpu: '2.2 GB', tip: 'klon' },
  { ad: 'klon-phi4-mini-latest',        rol: 'AKIL-K',       gpu: '2.3 GB', tip: 'klon' },
  { ad: 'klon-codellama-latest',        rol: 'KOD-K',        gpu: '3.8 GB', tip: 'klon' },
  { ad: 'klon-starcoder2-latest',       rol: 'KOD-2K',       gpu: '1.7 GB', tip: 'klon' },
  { ad: 'klon-llava-latest',            rol: 'GÖRSEL-K',     gpu: '4.7 GB', tip: 'klon' },
  { ad: 'klon-command-r-latest',        rol: 'KOMUTA-K',     gpu: '18 GB',  tip: 'klon' },
  { ad: 'klon-nomic-embed-text-latest', rol: 'ARAMA-K',      gpu: '274 MB', tip: 'klon' },
  { ad: 'klon-tinyllama-latest',        rol: 'HABER-K',      gpu: '637 MB', tip: 'klon' },
  { ad: 'klon-qwen3-0.6b',             rol: 'DÜŞÜNÜR-1K',   gpu: '522 MB', tip: 'klon' },
  { ad: 'klon-qwen2-0.5b',             rol: 'DÜŞÜNÜR-2K',   gpu: '352 MB', tip: 'klon' },
  { ad: 'klon-llama3.2-1b',            rol: 'HAFİF-1K',     gpu: '1.3 GB', tip: 'klon' },
  { ad: 'klon-gemma3-1b',              rol: 'HAFİF-2K',     gpu: '815 MB', tip: 'klon' },
  { ad: 'klon-gemma3-4b',              rol: 'GOOGLE-K',     gpu: '3.3 GB', tip: 'klon' },
  { ad: 'klon-qwen2.5-coder-3b',       rol: 'KOD-3K',       gpu: '1.9 GB', tip: 'klon' },
  { ad: 'klon-deepseek-r1-7b',         rol: 'MANTIK-K',     gpu: '4.7 GB', tip: 'klon' },
  { ad: 'klon-minicpm-v-latest',        rol: 'GÖRSEL-2K',   gpu: '5.5 GB', tip: 'klon' },
  { ad: 'klon-mistral-nemo-latest',     rol: 'UZUN-METİN-K', gpu: '7.1 GB', tip: 'klon' },
  { ad: 'klon-llama3-8b',              rol: 'META-K',       gpu: '4.7 GB', tip: 'klon' },
  { ad: 'klon-llama3.2-vision-11b',    rol: 'VİZYON-K',    gpu: '7.8 GB', tip: 'klon' },
  { ad: 'klon-phi4-latest',            rol: 'MİCROSOFT-K',  gpu: '9.1 GB', tip: 'klon' },
  { ad: 'klon-qwen3.5-4b',             rol: 'ÇOKLU-K',      gpu: '3.4 GB', tip: 'klon' },
  // ── SON 2 ORİJİNAL ──
  { ad: 'gemma:7b',                    rol: 'GEMMA-ESK',    gpu: '5.0 GB', tip: 'orijinal' },
  { ad: 'gpt-oss:20b',                 rol: 'OPENAI',       gpu: '13 GB',  tip: 'orijinal' },
  // ── SON 2 KLON ──
  { ad: 'klon-gemma-7b',               rol: 'GEMMA-ESK-K',  gpu: '5.0 GB', tip: 'klon' },
  { ad: 'klon-gpt-oss-20b',            rol: 'OPENAI-K',     gpu: '13 GB',  tip: 'klon' },
];

const tipRenk = (t: string) => {
  if (t === 'emir')    return 'border-red-500/40 bg-red-500/5';
  if (t === 'onay')    return 'border-amber-500/40 bg-amber-500/5';
  if (t === 'veri')    return 'border-fuchsia-500/40 bg-fuchsia-500/5';
  if (t === 'hata')    return 'border-amber-500/40 bg-amber-500/5';
  return 'border-rose-500/40 bg-rose-500/5';
};

export default function PlanningPanel() {
  const [komut,         setKomut]         = useState('');
  const [argeKomut,     setArgeKomut]     = useState('');
  const [isProcessing,  setIsProcessing]  = useState(false);
  const [argeProcessing,setArgeProcessing]= useState(false);
  const [cikti,         setCikti]         = useState('');
  const [argeCikti,     setArgeCikti]     = useState('');
  const [canliZaman,    setCanliZaman]    = useState(new Date().toLocaleTimeString('tr-TR'));
  const [canliAkis,     setCanliAkis]     = useState<any[]>([]);
  const [kararlar,      setKararlar]      = useState<any[]>([]);
  const [kararYukleniyor, setKararYukleniyor] = useState(false);
  const [seciliKarar,   setSeciliKarar]   = useState<any>(null);
  const [ekliDosyalar,  setEkliDosyalar]  = useState<any[]>([]);
  const [dragOver,      setDragOver]      = useState(false);
  const [isListening,   setIsListening]   = useState(false);
  const recognitionRef  = useRef<any>(null);

  const feedRef       = useRef<HTMLDivElement>(null);
  const dosyaInputRef = useRef<HTMLInputElement>(null);
  const resimInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setInterval(() => setCanliZaman(new Date().toLocaleTimeString('tr-TR')), 1000);
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'tr-TR';
      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          finalTranscript += event.results[i][0].transcript;
        }
        setKomut(finalTranscript);
      };
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
    }

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Kullanıcı herhangi bir Ctrl tuşuna (sol veya sağ CTRL) basarsa mikrofon tetiklenir
      if (e.key === 'Control') {
        // Form girişindeyse vs engellememesi için doğrudan butonu tetikliyoruz
        const micBtn = document.getElementById('mic-button');
        if (micBtn) micBtn.click();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);

    return () => {
      clearInterval(t);
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, []);

  const toggleListen = () => {
    if (!recognitionRef.current) {
      alert("Tarayıcınız sesli komutu desteklemiyor (Lütfen Chrome veya Edge kullanın).");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setKomut('');
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const dosyaEkle = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(file => {
      if (file.size > 10 * 1024 * 1024) { alert(`${file.name} çok büyük (max 10MB)`); return; }
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        setEkliDosyalar(prev => [...prev, { ad: file.name, tip: file.type, boyut: file.size, onizleme: file.type.startsWith('image/') ? base64 : undefined, data: base64 }]);
      };
      reader.readAsDataURL(file);
    });
  };
  const dosyaSil   = (i: number) => setEkliDosyalar(prev => prev.filter((_, idx) => idx !== i));
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false); dosyaEkle(e.dataTransfer.files); };

  const kararlariYukle = useCallback(async () => {
    setKararYukleniyor(true);
    try { const res = await fetch('/api/kararlar'); const data = await res.json(); setKararlar(data.kararlar || []); }
    catch { setKararlar([]); }
    setKararYukleniyor(false);
  }, []);

  useEffect(() => { kararlariYukle(); }, [kararlariYukle]);

  const komutGonder = async () => {
    if ((!komut.trim() && ekliDosyalar.length === 0) || isProcessing) return;
    setIsProcessing(true); setCikti('');
    const dosyaBilgi = ekliDosyalar.length > 0 ? ` [${ekliDosyalar.map(d => d.ad).join(', ')}]` : '';
    setCanliAkis(prev => [{ id: Date.now(), ajan: 'SEN', hedef: 'KURUL', mesaj: (komut || '(Dosya)') + dosyaBilgi, zaman: canliZaman, tip: 'emir' }, ...prev]);
    try {
      const res  = await fetch('/api/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: komut, dosyalar: ekliDosyalar.map(d => ({ ad: d.ad, tip: d.tip, boyut: d.boyut, data: d.data })) }),
      });
      const data = await res.json();
      if (data.error) { setCikti(`HATA: ${data.error}`); setCanliAkis(prev => [{ id: Date.now()+1, ajan: 'SİSTEM', hedef: 'SEN', mesaj: data.error, zaman: new Date().toLocaleTimeString('tr-TR'), tip: 'hata' }, ...prev]); }
      else {
        setCikti(`[${data.status}] ${data.message}\n\n[MİMAR PLANI]:\n${data.mimar_taslagi || '-'}\n\n[DENETÇİ]:\n${data.denetim_raporu || '-'}`);
        setCanliAkis(prev => [{ id: Date.now()+1, ajan: 'KURUL', hedef: 'SEN', mesaj: `${data.status} — ${data.message}`, zaman: new Date().toLocaleTimeString('tr-TR'), tip: data.status === 'PASS' ? 'onay' : 'hata' }, ...prev]);
        kararlariYukle();
      }
    } catch (err: any) { setCikti(`BAĞLANTI HATASI: ${err.message}`); }
    finally { setIsProcessing(false); setKomut(''); setEkliDosyalar([]); }
  };

  const argeGonder = async () => {
    if (!argeKomut.trim() || argeProcessing) return;
    setArgeProcessing(true); setArgeCikti('');
    setCanliAkis(prev => [{ id: Date.now(), ajan: 'SEN', hedef: 'ARGE', mesaj: argeKomut, zaman: canliZaman, tip: 'veri' }, ...prev]);
    try {
      const res  = await fetch('/api/intake', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ task: `[ARGE]: ${argeKomut}` }) });
      const data = await res.json();
      setArgeCikti(data.mimar_taslagi || data.error || '-');
    } catch (err: any) { setArgeCikti(`BAĞLANTI HATASI: ${err.message}`); }
    finally { setArgeProcessing(false); setArgeKomut(''); }
  };

  return (
    <div className="h-full flex flex-col bg-transparent gap-1 box-border overflow-hidden">
      <AgentAuthorityBadge agentName="K-1 KOMUTAN" agentRole="KURUL MASASI" status="ACTIVE" />

      {/* ÜST BAR */}
      <div className="flex items-center justify-between px-4 py-1 bg-[#0a0e1a] border-b border-rose-500/20 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-[10px] font-black text-amber-400 tracking-[0.2em]">KURUL MASASI</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-rose-400">{canliZaman}</span>
          <span className="text-[8px] font-mono text-slate-500">{AI_MODELLERI.length} MODEL TANIMLI · OLLAMA YERELde</span>
        </div>
      </div>

      {/* ANA İÇERİK */}
      <div className="flex-1 flex flex-col gap-1 px-2 overflow-hidden min-h-0">

        {/* ÜST YARI */}
        <div className="h-[55%] flex gap-1.5 shrink-0">

          {/* KOMUT */}
          <div
            className={`w-[35%] bg-[#0a0e1a] border rounded flex flex-col overflow-hidden transition-colors ${dragOver ? 'border-purple-400 bg-purple-500/10' : 'border-purple-500/30'}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <div className="px-3 py-1.5 border-b border-purple-500/15 flex items-center justify-between shrink-0 bg-[#080c16]">
              <div className="flex items-center gap-1.5">
                <Terminal className="w-3 h-3 text-purple-400" />
                <span className="text-[9px] font-black text-purple-400 tracking-widest">KURUL EMİR</span>
              </div>
              <div className="flex items-center gap-1">
                <button id="mic-button" onClick={toggleListen} title="Sesli Komut (CTRL Tuşu)" className={`p-1 rounded transition-all ${isListening ? 'bg-red-500/20 text-red-500 animate-pulse' : 'hover:bg-purple-500/20 text-purple-400/60 hover:text-purple-400'}`}>
                  <Mic className="w-3.5 h-3.5" />
                </button>
                <input ref={dosyaInputRef} type="file" multiple className="hidden" onChange={(e) => dosyaEkle(e.target.files)} />
                <input ref={resimInputRef} type="file" multiple accept="image/*" className="hidden" onChange={(e) => dosyaEkle(e.target.files)} />
                <button onClick={() => resimInputRef.current?.click()} title="Resim Ekle" className="p-1 rounded hover:bg-purple-500/20 text-purple-400/60 hover:text-purple-400 transition-all"><ImageIcon className="w-3.5 h-3.5" /></button>
                <button onClick={() => dosyaInputRef.current?.click()} title="Dosya Ekle"  className="p-1 rounded hover:bg-purple-500/20 text-purple-400/60 hover:text-purple-400 transition-all"><Paperclip  className="w-3.5 h-3.5" /></button>
              </div>
            </div>
            {ekliDosyalar.length > 0 && (
              <div className="flex flex-wrap gap-1 px-2 py-1 border-b border-purple-500/10 shrink-0">
                {ekliDosyalar.map((d, i) => (
                  <div key={i} className="flex items-center gap-1 bg-purple-500/10 border border-purple-500/20 rounded px-1.5 py-0.5">
                    {d.onizleme ? <img src={d.onizleme} alt={d.ad} className="w-5 h-5 rounded object-cover" /> : <FileText className="w-3 h-3 text-purple-400" />}
                    <span className="text-[8px] text-purple-300 font-mono truncate max-w-[80px]">{d.ad}</span>
                    <button onClick={() => dosyaSil(i)} className="text-red-500/50 hover:text-red-400"><Trash2 className="w-2.5 h-2.5" /></button>
                  </div>
                ))}
              </div>
            )}
            {dragOver && <div className="p-2 border-2 border-dashed border-purple-400/50 bg-purple-500/10 text-center shrink-0"><span className="text-[10px] text-purple-400 font-black">DOSYAYI BIRAK</span></div>}
            <div className="flex-1 flex flex-col p-2 gap-1.5">
              <textarea
                value={komut}
                onChange={(e) => setKomut(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); komutGonder(); } }}
                placeholder="Komutu yaz, Enter ile gönder..."
                className="flex-1 bg-black/40 border border-white/10 rounded text-[12px] text-white p-2 resize-none outline-none focus:border-purple-500/50 font-mono leading-relaxed"
              />
              <button onClick={komutGonder} disabled={isProcessing} className={`w-full py-2 rounded text-[10px] font-black tracking-wider transition-all ${isProcessing ? 'bg-purple-900/30 text-purple-600' : 'bg-purple-600 text-white hover:bg-purple-500 active:scale-[0.98]'}`}>
                {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin mx-auto" /> : '📡 EMİR GÖNDER'}
              </button>
            </div>
          </div>

          {/* ÇIKTI */}
          <div className="w-[40%] bg-[#0a0e1a] border border-rose-500/20 rounded flex flex-col overflow-hidden">
            <div className="px-3 py-1.5 border-b border-rose-500/15 flex items-center gap-2 shrink-0 bg-[#080c16]">
              <BrainCircuit className="w-3.5 h-3.5 text-rose-400" />
              <span className="text-[9px] font-black text-rose-400 tracking-widest">KURUL ÇIKTISI</span>
            </div>
            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
              {cikti ? (
                <pre className="text-[9px] text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">{cikti}</pre>
              ) : (
                <div className="h-full flex flex-col items-center justify-center opacity-20">
                  <BrainCircuit className="w-8 h-8 text-rose-500 mb-2" />
                  <span className="text-[9px] font-black text-slate-500 tracking-widest">EMİR BEKLENİYOR</span>
                </div>
              )}
            </div>
          </div>

          {/* ARGE */}
          <div className="w-[25%] bg-[#0a0e1a] border border-fuchsia-500/30 rounded flex flex-col overflow-hidden">
            <div className="px-3 py-1.5 border-b border-fuchsia-500/15 flex items-center justify-between shrink-0 bg-[#060a14]">
              <div className="flex items-center gap-2">
                <Radar className="w-3.5 h-3.5 text-fuchsia-400" />
                <span className="text-[9px] font-black text-fuchsia-400 tracking-widest">ARGE HATTI</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
              {argeCikti ? (
                <pre className="text-[9px] text-fuchsia-200 font-mono whitespace-pre-wrap leading-relaxed">{argeCikti}</pre>
              ) : (
                <div className="flex items-center justify-center h-full opacity-20"><span className="text-[8px] text-slate-500 font-black tracking-widest">ARGE BEKLİYOR</span></div>
              )}
            </div>
            <div className="p-1.5 border-t border-fuchsia-500/15 flex gap-1 shrink-0">
              <input value={argeKomut} onChange={(e) => setArgeKomut(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') argeGonder(); }} placeholder="ARGE'ye soru sor..." className="flex-1 bg-black/40 border border-fuchsia-500/20 rounded text-[9px] text-white px-2 py-1 outline-none focus:border-fuchsia-500/50 font-mono" />
              <button onClick={argeGonder} disabled={argeProcessing} className={`px-2 rounded text-[8px] font-black transition-all ${argeProcessing ? 'bg-fuchsia-900/30 text-fuchsia-600' : 'bg-fuchsia-600 text-white hover:bg-fuchsia-500'}`}>{argeProcessing ? '…' : '▶'}</button>
            </div>
          </div>
        </div>

        {/* ALT YARI */}
        <div className="flex-1 flex gap-1.5 min-h-0">

          {/* CANLI AKIŞ — sadece gerçek komutlar */}
          <div className="w-[25%] bg-[#0a0e1a] border border-rose-500/20 rounded flex flex-col overflow-hidden">
            <div className="px-2 py-1.5 border-b border-rose-500/15 flex items-center justify-between shrink-0 bg-[#080c16]">
              <div className="flex items-center gap-1.5">
                <Eye className="w-3 h-3 text-rose-400" />
                <span className="text-[9px] font-black text-rose-400 tracking-widest">OTURUM AKIŞI</span>
              </div>
              <span className="text-[7px] font-mono text-slate-600">{canliAkis.length} kayıt</span>
            </div>
            <div ref={feedRef} className="flex-1 overflow-y-auto p-1.5 space-y-1 custom-scrollbar">
              {canliAkis.length === 0 && (
                <div className="flex items-center justify-center h-full opacity-20"><span className="text-[8px] text-slate-500 font-black">EMİR GELİNCE DOLAR</span></div>
              )}
              {canliAkis.map((msg) => (
                <div key={msg.id} className={`p-1.5 border rounded ${tipRenk(msg.tip)} transition-all animate-fade-in`}>
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-1">
                      <span className="text-[8px] font-black text-white">{msg.ajan}</span>
                      <ArrowUpRight className="w-2 h-2 text-slate-500" />
                      <span className="text-[7px] font-mono text-slate-400">{msg.hedef}</span>
                    </div>
                    <span className="text-[6px] font-mono text-slate-600">{msg.zaman}</span>
                  </div>
                  <p className="text-[8px] text-slate-300 leading-relaxed">{msg.mesaj}</p>
                </div>
              ))}
            </div>
          </div>

          {/* KARARLAR — gerçek JSON dosyaları */}
          <div className="w-[22%] bg-[#0a0e1a] border border-orange-500/20 rounded flex flex-col overflow-hidden">
            <div className="px-2 py-1.5 border-b border-orange-500/15 flex items-center justify-between shrink-0 bg-[#0c0a10]">
              <div className="flex items-center gap-1.5">
                <FileText className="w-3 h-3 text-orange-400" />
                <span className="text-[9px] font-black text-orange-400 tracking-widest">KARARLAR</span>
                <span className="text-[7px] bg-orange-500/15 text-orange-300 px-1 py-0.5 rounded font-mono">{kararlar.length}</span>
              </div>
              <button onClick={kararlariYukle} className="text-[7px] bg-orange-500/10 text-orange-400 px-1.5 py-0.5 rounded hover:bg-orange-500/30 font-black">{kararYukleniyor ? '…' : '↻'}</button>
            </div>
            <div className="flex-1 overflow-y-auto p-1.5 space-y-1 custom-scrollbar">
              {kararlar.length === 0 ? (
                <div className="flex items-center justify-center h-full opacity-20"><span className="text-[8px] text-slate-500 font-black">KARAR YOK</span></div>
              ) : kararlar.map((k: any, i: number) => (
                <div key={i} onClick={() => setSeciliKarar(seciliKarar?.dosya === k.dosya ? null : k)} className="cursor-pointer px-2 py-1.5 bg-black/30 border border-white/5 rounded hover:border-orange-500/30 transition-all">
                  <span className="text-[8px] font-black text-white block truncate">{k.gorev}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[7px] px-1 py-0.5 rounded font-black ${k.durum === 'PASS' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>{k.durum}</span>
                    <span className="text-[7px] font-mono text-slate-600">{new Date(k.tarih).toLocaleTimeString('tr-TR')}</span>
                  </div>
                  {seciliKarar?.dosya === k.dosya && <pre className="mt-1 p-1.5 bg-black/50 rounded text-[7px] text-orange-200 font-mono whitespace-pre-wrap border border-orange-500/10 max-h-[120px] overflow-y-auto">{k.muhur}</pre>}
                </div>
              ))}
            </div>
          </div>

          {/* AI MODELLERİ — gerçek Ollama modelleri */}
          <div className="flex-1 bg-[#0a0e1a] border border-amber-500/20 rounded flex flex-col overflow-hidden">
            <div className="px-2 py-1.5 border-b border-amber-500/15 flex items-center justify-between shrink-0 bg-[#0a0a10]">
              <div className="flex items-center gap-2">
                <Cpu className="w-3 h-3 text-amber-400" />
                <span className="text-[9px] font-black text-amber-400 tracking-widest">OLLAMA MODELLERİ</span>
              </div>
              <span className="text-[7px] text-slate-500 font-mono">localhost:11434</span>
            </div>
            <div className="flex-1 overflow-y-auto p-1.5 space-y-1 custom-scrollbar">
              {AI_MODELLERI.map((m, i) => (
                <div key={i} className="flex items-center justify-between px-2 py-2 bg-black/30 border border-white/5 rounded hover:border-amber-500/20 transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
                    <span className="text-[11px] font-black text-white">{m.ad}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] font-mono text-amber-400/70">{m.rol}</span>
                    <span className="text-[8px] font-mono text-slate-600">{m.gpu}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(6,182,212,0.3); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }
        @keyframes fade-in { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:translateY(0); } }
        .animate-fade-in { animation: fade-in 0.3s ease-out; }
      `}</style>
    </div>
  );
}

