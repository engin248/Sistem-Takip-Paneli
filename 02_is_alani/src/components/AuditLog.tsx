"use client";
import { useEffect, useState, useRef } from 'react';
import { fetchAuditLogs } from '@/services/auditService';
import { supabase } from '@/lib/supabase';
import { ERR, processError } from '@/lib/errorCore';
import { handleError } from '@/lib/errorHandler';
import { useLanguageStore } from '@/store/useLanguageStore';
import { t } from '@/lib/i18n';

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const { lang, dir } = useLanguageStore();
  const tr = t(lang);

  const loadLogs = async () => {
    try {
      const data = await fetchAuditLogs();
      setLogs(data as AuditLogRecord[]);
    } catch (err) {
      await handleError(ERR.AUDIT_READ, err, { kaynak: 'AuditLog.loadLogs', islem: 'FETCH' });
    }
  };

  // Auto-scroll: yeni log geldiğinde en alta kaydır
  useEffect(() => {
    if (scrollRef.current && logs.length > 0) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadLogs();

    let channel: ReturnType<typeof supabase.channel> | null = null;
    let reconnectTimer: NodeJS.Timeout;

    const connectRealtime = (retryCount = 0) => {
      try {
        // Benzersiz isim vererek çakışmaları önle (Fast Refresh / Strict Mode)
        const channelName = `audit_logs_${Math.random().toString(36).substring(7)}`;
        channel = supabase
          .channel(channelName)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, () => {
            loadLogs();
          })
          .subscribe((status) => {
            if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              handleError(ERR.AUDIT_REALTIME, new Error(`Realtime kanal durumu: ${status}`), {
                kaynak: 'AuditLog.subscribe',
                islem: 'CHANNEL_STATUS_RETRY',
                durum: status,
                deneme: retryCount
              });
              
              // Exponential backoff ile yeniden bağlanmayı dene
              if (retryCount < 5) {
                const delay = Math.min(1000 * (2 ** retryCount), 15000);
                reconnectTimer = setTimeout(() => {
                  if (channel) supabase.removeChannel(channel);
                  connectRealtime(retryCount + 1);
                }, delay);
              }
            }
          });
      } catch (err) {
        handleError(ERR.AUDIT_REALTIME, err, { kaynak: 'AuditLog.useEffect', islem: 'SUBSCRIBE' });
      }
    };

    connectRealtime();

    return () => {
      clearTimeout(reconnectTimer);
      try {
        if (channel) supabase.removeChannel(channel);
      } catch (err) {
        processError(ERR.UNIDENTIFIED_COLLAPSE, err, { kaynak: 'AuditLog.cleanup', islem: 'REMOVE_CHANNEL' }, 'FATAL');
      }
    };
  }, []);

  return (
    <section>
      <div className={`flex justify-between items-center mb-4 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
        <h2 className="text-sm font-bold text-slate-500 tracking-widest uppercase text-start">
          {tr.auditTitle}
          <span className="ms-2 text-[9px] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full">
            {logs.length}
          </span>
        </h2>
        <button onClick={loadLogs} className="text-[10px] text-blue-500 hover:underline font-bold">{tr.refresh}</button>
      </div>
      <div ref={scrollRef} className="space-y-2 max-h-80 overflow-y-auto scroll-smooth">
        {logs.length === 0 && <p className="text-[10px] text-slate-400 italic">{tr.noRecords}</p>}
        {logs.map((log) => (
          <div key={log.id} className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-start">
            <div className={`flex justify-between mb-1 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
              <span className="text-[10px] font-bold text-blue-600 font-mono">
                {(log.metadata as Record<string, string>)?.action_code || log.operation_type}
              </span>
              <span className="text-[9px] text-slate-400">
                {new Date(log.created_at).toLocaleTimeString(lang === 'ar' ? 'ar-SA' : 'tr-TR')}
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
