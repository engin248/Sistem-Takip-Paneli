"use client";
import { useEffect, useState } from 'react';
import { fetchAuditLogs } from '@/services/auditService';
import { supabase } from '@/lib/supabase';

// BUG-011 FIX: any tipi doğru tipe dönüştürüldü
interface AuditLogRecord {
  id: string;
  log_code: string;
  operation_type: string;
  action_description: string;
  created_at: string;
  metadata?: Record<string, unknown>;
}

export default function AuditLog() {
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);

  const loadLogs = async () => {
    const data = await fetchAuditLogs();
    setLogs(data as AuditLogRecord[]);
  };

  useEffect(() => {
    loadLogs();

    // Realtime dinleme — audit log değişikliklerini yakala
    const channel = supabase
      .channel('audit_logs_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, () => {
        loadLogs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <section>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-sm font-bold text-slate-500 tracking-widest uppercase text-start">Denetim Günlüğü</h2>
        <button onClick={loadLogs} className="text-[10px] text-blue-500 hover:underline">YENİLE</button>
      </div>
      <div className="space-y-2">
        {logs.length === 0 && <p className="text-[10px] text-slate-400 italic">Kayıt bulunamadı.</p>}
        {logs.map((log) => (
          <div key={log.id} className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-start">
            <div className="flex justify-between mb-1">
              <span className="text-[10px] font-bold text-blue-600 font-mono">
                {(log.metadata as Record<string, string>)?.action_code || log.operation_type}
              </span>
              <span className="text-[9px] text-slate-400">
                {new Date(log.created_at).toLocaleTimeString('tr-TR')}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-tight">
              {log.action_description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
