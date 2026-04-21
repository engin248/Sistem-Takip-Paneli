'use client';

import { useEffect, useState } from 'react';

interface HealthData {
    status: string;
    latencyMs: number;
    timestamp: string;
    last24h: {
        commands: { total: number; completed: number; failed: number; active: number };
        proofs: { total: number; valid: number; invalid: number };
        alerts: { total: number; critical: number };
        totalLogs: number;
    };
    modules: { module: string; status: string; lastCheck: string }[];
}

interface AlertItem {
    id: string;
    severity: number;
    rule_triggered: string;
    module: string;
    details: { message?: string; commandId?: string };
    created_at: string;
    resolved: boolean;
}

export default function PipelineDashboard() {
    const [health, setHealth]       = useState<HealthData | null>(null);
    const [alerts, setAlerts]       = useState<AlertItem[]>([]);
    const [activeTab, setActiveTab] = useState('overview');
    const [loading, setLoading]     = useState(true);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, []);

    async function fetchData() {
        try {
            const [healthRes, alertRes] = await Promise.all([
                fetch('/api/health'),
                fetch('/api/alerts?limit=20'),
            ]);
            if (healthRes.ok) setHealth(await healthRes.json());
            if (alertRes.ok) {
                const data = await alertRes.json();
                setAlerts(data.alerts || []);
            }
        } catch (e) {
            console.error('Veri çekme hatası:', e);
        } finally {
            setLoading(false);
        }
    }

    async function resolveAlert(alertId: string) {
        await fetch('/api/alerts', {
            method:  'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ alertId }),
        });
        setAlerts(prev => prev.filter(a => a.id !== alertId));
    }

    const statusEmoji = { healthy: '🟢', degraded: '🟡', down: '🔴' };
    const statusLabel = { healthy: 'Sağlıklı', degraded: 'Degraded', down: 'Kritik' };

    return (
        <div className="dashboard">
            {/* Sidebar */}
            <aside className="sidebar">
                <div className="sidebar-logo">
                    <div className="dot" />
                    <h1>V-FINAL</h1>
                </div>

                <div className="nav-section">İZLEME</div>
                <button className={`nav-item ${activeTab === 'overview'  ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>📊 Genel Bakış</button>
                <button className={`nav-item ${activeTab === 'pipeline'  ? 'active' : ''}`} onClick={() => setActiveTab('pipeline')}>⚡ Pipeline</button>
                <button className={`nav-item ${activeTab === 'alerts'    ? 'active' : ''}`} onClick={() => setActiveTab('alerts')}>
                    🔔 Alarmlar {alerts.length > 0 && <span className="badge badge-down">{alerts.length}</span>}
                </button>

                <div className="nav-section">GÜVENLİK</div>
                <button className={`nav-item ${activeTab === 'proofs' ? 'active' : ''}`} onClick={() => setActiveTab('proofs')}>🔐 Proof Chain</button>
                <button className={`nav-item ${activeTab === 'logs'   ? 'active' : ''}`} onClick={() => setActiveTab('logs')}>📜 Loglar</button>

                <div className="nav-section">SİSTEM</div>
                <button className={`nav-item ${activeTab === 'modules' ? 'active' : ''}`} onClick={() => setActiveTab('modules')}>🧩 Modüller</button>
            </aside>

            {/* Main */}
            <main className="main">
                {loading ? (
                    <div>
                        <div className="skeleton" style={{ height: 40, width: 300, marginBottom: 32 }} />
                        <div className="card-grid">
                            {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 140 }} />)}
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div className="main-header">
                            <h2>
                                {activeTab === 'overview' ? 'Genel Bakış' :
                                 activeTab === 'pipeline' ? 'Pipeline Akışı' :
                                 activeTab === 'alerts'   ? 'Alarmlar' :
                                 activeTab === 'proofs'   ? 'Proof Chain' :
                                 activeTab === 'logs'     ? 'İmmutable Loglar' : 'Modüller'}
                            </h2>
                            <span className={`badge badge-${health?.status || 'down'}`}>
                                {statusEmoji[health?.status as keyof typeof statusEmoji] || '🔴'}{' '}
                                {statusLabel[health?.status as keyof typeof statusLabel] || 'Bilinmiyor'}
                            </span>
                        </div>

                        {/* Overview */}
                        {activeTab === 'overview' && health && (
                            <>
                                <div className="card-grid">
                                    <div className="card">
                                        <div className="card-icon">⚡</div>
                                        <div className="card-label">Komutlar (24s)</div>
                                        <div className="card-value">{health.last24h.commands.total}</div>
                                        <div className="card-sub">✅ {health.last24h.commands.completed} · ❌ {health.last24h.commands.failed}</div>
                                    </div>
                                    <div className="card">
                                        <div className="card-icon">🔐</div>
                                        <div className="card-label">Kanıtlar</div>
                                        <div className="card-value">{health.last24h.proofs.total}</div>
                                        <div className="card-sub">✓ {health.last24h.proofs.valid} · ✗ {health.last24h.proofs.invalid}</div>
                                    </div>
                                    <div className="card">
                                        <div className="card-icon">🔔</div>
                                        <div className="card-label">Aktif Alarmlar</div>
                                        <div className="card-value" style={{ color: health.last24h.alerts.critical > 0 ? 'var(--accent-red)' : 'var(--accent-emerald)' }}>
                                            {health.last24h.alerts.total}
                                        </div>
                                        <div className="card-sub">🔴 {health.last24h.alerts.critical} kritik</div>
                                    </div>
                                    <div className="card">
                                        <div className="card-icon">📜</div>
                                        <div className="card-label">Toplam Log</div>
                                        <div className="card-value">{health.last24h.totalLogs.toLocaleString()}</div>
                                        <div className="card-sub">⏱ {health.latencyMs}ms</div>
                                    </div>
                                </div>

                                <div className="table-container">
                                    <div className="table-header"><h3>Pipeline Akışı</h3></div>
                                    <div style={{ padding: 24 }}>
                                        <div className="pipeline-flow">
                                            {['K1 Gate','K2.1 AI','K2.3 Kriter','K3 Spec','K5 Proof','K4 RedTeam','K6 Consensus','K7 Gate✓','K8 Exec','K9 Post'].map((step, i) => (
                                                <span key={step}>
                                                    {i > 0 && <span className="pipeline-arrow"> → </span>}
                                                    <span className="pipeline-step active">{step}</span>
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Alerts */}
                        {activeTab === 'alerts' && (
                            <div className="table-container">
                                <div className="table-header">
                                    <h3>Aktif Alarmlar</h3>
                                    <span className="badge badge-down">{alerts.length}</span>
                                </div>
                                {alerts.length === 0 ? (
                                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>✅ Aktif alarm yok</div>
                                ) : (
                                    <table>
                                        <thead><tr><th>Seviye</th><th>Kural</th><th>Modül</th><th>Detay</th><th>Zaman</th><th></th></tr></thead>
                                        <tbody>
                                            {alerts.map(a => (
                                                <tr key={a.id}>
                                                    <td><span className={`status-dot ${a.severity >= 4 ? 'red' : a.severity >= 3 ? 'yellow' : 'blue'}`} />S{a.severity}</td>
                                                    <td className="mono">{a.rule_triggered}</td>
                                                    <td>{a.module}</td>
                                                    <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.details?.message || '—'}</td>
                                                    <td className="mono">{new Date(a.created_at).toLocaleTimeString('tr-TR')}</td>
                                                    <td><button className="nav-item" style={{ padding: '4px 12px', fontSize: 12 }} onClick={() => resolveAlert(a.id)}>✓ Çöz</button></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        )}

                        {/* Pipeline */}
                        {activeTab === 'pipeline' && (
                            <div className="table-container">
                                <div className="table-header"><h3>Pipeline Katmanları</h3></div>
                                <table>
                                    <thead><tr><th>#</th><th>Katman</th><th>Görev</th><th>Durum</th></tr></thead>
                                    <tbody>
                                        {[
                                            { id: 'K0',  name: 'Bootstrap',     task: 'Sistem açılış kontrolü' },
                                            { id: 'K1',  name: 'L0 Gatekeeper', task: 'Sanitize + yetki + replay' },
                                            { id: 'K2.1',name: 'Sistem Takip Paneli Analiz', task: "6'lı analiz (Ollama)" },
                                            { id: 'K2.3',name: 'Kriter Motoru', task: '92 kriter × 3 mod' },
                                            { id: 'K3',  name: 'Formal Spec',   task: 'Pre/post condition' },
                                            { id: 'K5',  name: 'Proof Engine',  task: 'Constraint solve + verify' },
                                            { id: 'K4',  name: 'Red Team',      task: '12 saldırı çürütme' },
                                            { id: 'K6',  name: 'Konsensüs',     task: 'Quorum 2/3 + Veto' },
                                            { id: 'K7',  name: 'Gate Check',    task: '8+1 kapı kontrolü' },
                                            { id: 'K8',  name: 'Execution',     task: 'Snapshot + rollback' },
                                            { id: 'K9',  name: 'Post-Exec',     task: 'Merkle chain + health' },
                                        ].map(k => (
                                            <tr key={k.id}>
                                                <td className="mono">{k.id}</td>
                                                <td style={{ fontWeight: 600 }}>{k.name}</td>
                                                <td style={{ color: 'var(--text-secondary)' }}>{k.task}</td>
                                                <td><span className="status-dot green" />Aktif</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Modules */}
                        {activeTab === 'modules' && health && (
                            <div className="table-container">
                                <div className="table-header"><h3>Modül Durumları</h3></div>
                                <table>
                                    <thead><tr><th>Modül</th><th>Durum</th><th>Son Kontrol</th></tr></thead>
                                    <tbody>
                                        {(health.modules || []).map(m => (
                                            <tr key={m.module}>
                                                <td className="mono">{m.module}</td>
                                                <td>
                                                    <span className={`status-dot ${m.status === 'healthy' ? 'green' : m.status === 'degraded' ? 'yellow' : 'red'}`} />
                                                    {m.status}
                                                </td>
                                                <td className="mono">{new Date(m.lastCheck).toLocaleTimeString('tr-TR')}</td>
                                            </tr>
                                        ))}
                                        {(!health.modules || health.modules.length === 0) && (
                                            <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>
                                                Henüz modül kaydı yok — Bootstrap çalıştırın
                                            </td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Proofs & Logs */}
                        {(activeTab === 'proofs' || activeTab === 'logs') && (
                            <div className="table-container">
                                <div className="table-header">
                                    <h3>{activeTab === 'proofs' ? 'Proof Chain' : 'İmmutable Loglar'}</h3>
                                </div>
                                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                                    📡 Veriler yükleniyor...
                                    <br /><br />
                                    <span className="mono" style={{ fontSize: 12 }}>
                                        GET /api/{activeTab === 'proofs' ? 'proof-chain' : 'logs'}
                                    </span>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}
