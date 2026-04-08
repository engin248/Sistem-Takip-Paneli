"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AuditLog() {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    const fetchLogs = async () => {
      const { data } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      setLogs(data || []);
    };

    fetchLogs();
    
    // Realtime dinleme (Gelecek adımda aktif edilebilir)
  }, []);

  return (
    <section className="mt-12 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-300 text-start">
      <h2 className="text-[10px] font-bold text-slate-500 mb-4 tracking-[0.3em] uppercase">Sistem Günlüğü (Son 5 İşlem)</h2>
      <div className="space-y-2">
        {logs.length === 0 && <p className="text-[10px] text-slate-400 italic">Kayıt bulunamadı.</p>}
        {logs.map((log) => (
          <div key={log.id} className="flex justify-between text-[11px] font-mono border-b border-slate-200 dark:border-slate-800 pb-1 gap-4">
            <div className="flex flex-col">
              <span className="text-blue-600 dark:text-blue-400 font-bold">{log.log_code}</span>
              <span className="text-[9px] text-slate-500">{log.action_description}</span>
            </div>
            <span className="text-slate-400 whitespace-nowrap">{new Date(log.created_at).toLocaleTimeString('tr-TR')}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
