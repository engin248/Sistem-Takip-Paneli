'use client';

import { useEffect, useState } from 'react';

interface LogItem {
    id:         string;
    module:     string;
    event_type: string;
    severity:   string;
    payload:    Record<string, unknown>;
    hash:       string;
    created_at: string;
}

export default function LogsPage() {
    const [logs, setLogs]       = useState<LogItem[]>([]);
    const [total, setTotal]     = useState(0);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter]   = useState({ module: '', severity: '' });
    const [offset, setOffset]   = useState(0);
    const LIMIT = 50;

    useEffect(() => { fetchLogs(); }, [offset, filter]);

    async function fetchLogs() {
        setLoading(true);
        const params = new URLSearchParams({ limit: String(LIMIT), offset: String(offset) });
        if (filter.module)   params.set('module', filter.module);
        if (filter.severity) params.set('severity', filter.severity);
        try {
            const res  = await fetch(`/api/logs?${params}`);
            const data = await res.json();
            setLogs(data.logs || []);
            setTotal(data.total || 0);
        } catch { setLogs([]); }
        finally  { setLoading(false); }
    }

    const severityColor: Record<string, string> = {
        critical: 'var(--accent-red)',
        warning:  'var(--accent-gold)',
        info:     'var(--accent-blue)',
    };

    return (
        <div style={{ padding: 32 }}>
            <div className="main-header">
                <h2>📜 İmmutable Loglar</h2>
                <span className="badge badge-healthy">A6 Korumalı — Silinemez</span>
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                <select value={filter.module}
                    onChange={e => { setFilter(f => ({ ...f, module: e.target.value })); setOffset(0); }}
                    style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 16px', fontSize: 13 }}>
                    <option value="">Tüm Modüller</option>
                    {['K0','K1','K2','K4','K6','K8','K9','pipeline','watchdog'].map(m => (
                        <option key={m} value={m}>{m}</option>
                    ))}
                </select>

                <select value={filter.severity}
                    onChange={e => { setFilter(f => ({ ...f, severity: e.target.value })); setOffset(0); }}
                    style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 16px', fontSize: 13 }}>
                    <option value="">Tüm Seviyeler</option>
                    <option value="critical">🔴 Critical</option>
                    <option value="warning">🟡 Warning</option>
                    <option value="info">🔵 Info</option>
                </select>

                <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: 13, alignSelf: 'center' }}>
                    Toplam: {total.toLocaleString()} kayıt
                </span>
            </div>

            <div className="table-container">
                {loading ? (
                    <div style={{ padding: 40 }}>
                        {[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: 44, marginBottom: 4 }} />)}
                    </div>
                ) : logs.length === 0 ? (
                    <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>📭 Log kaydı bulunamadı</div>
                ) : (
                    <table>
                        <thead>
                            <tr><th>Seviye</th><th>Modül</th><th>Olay</th><th>Detay</th><th>Hash</th><th>Zaman</th></tr>
                        </thead>
                        <tbody>
                            {logs.map(log => (
                                <tr key={log.id}>
                                    <td>
                                        <span style={{ color: severityColor[log.severity] || 'var(--text-secondary)', fontWeight: 600, fontSize: 12 }}>
                                            {log.severity === 'critical' ? '🔴' : log.severity === 'warning' ? '🟡' : '🔵'}{' '}{log.severity.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="mono" style={{ fontWeight: 600 }}>{log.module}</td>
                                    <td className="mono">{log.event_type}</td>
                                    <td style={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {JSON.stringify(log.payload).substring(0, 80)}
                                    </td>
                                    <td className="mono" style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                                        {log.hash ? `${log.hash.substring(0, 10)}…` : '—'}
                                    </td>
                                    <td className="mono" style={{ whiteSpace: 'nowrap', fontSize: 12 }}>
                                        {new Date(log.created_at).toLocaleString('tr-TR')}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {total > LIMIT && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 12, padding: 20 }}>
                        <button className="nav-item" style={{ width: 'auto', padding: '6px 16px' }}
                            disabled={offset === 0} onClick={() => setOffset(o => Math.max(0, o - LIMIT))}>← Önceki</button>
                        <span style={{ alignSelf: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
                            {offset + 1}–{Math.min(offset + LIMIT, total)} / {total}
                        </span>
                        <button className="nav-item" style={{ width: 'auto', padding: '6px 16px' }}
                            disabled={offset + LIMIT >= total} onClick={() => setOffset(o => o + LIMIT)}>Sonraki →</button>
                    </div>
                )}
            </div>
        </div>
    );
}
