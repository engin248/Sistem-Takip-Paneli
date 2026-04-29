// ============================================================
// HAT BRIDGE — Merkezi Hat Köprü Servisi
// ============================================================
// Hat1 (RED_LINE_TASKS), Hat2 (LOG_LINE), Hat3 (DATA_LINE)
// In-memory buffer + TCP push (net modülü ile doğrudan)
//
// Bu modül:
//   - RED_LINE_TASKS'a plan fırlatır (TCP:6379)
//   - LOG_LINE ve DATA_LINE verilerini buffer'da tutar
//   - API route'ları bu buffer'lardan okur
// ============================================================

import { logAudit } from '@/services/auditService';
import * as net from 'net';

// ── TİPLER ───────────────────────────────────────────────────
export interface HatLogEntry {
  id         : string;
  agent_id   : string;
  agent_name : string;
  katman     : string;
  mesaj      : string;
  tip        : 'BILGI' | 'UYARI' | 'HATA' | 'BASARI';
  timestamp  : string;
}

export interface HatMetricEntry {
  id         : string;
  metrik     : string;
  deger      : number;
  birim      : string;
  kaynak     : string;
  timestamp  : string;
}

export interface HatPushPayload {
  plan_id   ?: string;
  title      : string;
  description?: string;
  assignee  ?: string;
  priority  ?: string;
  timestamp  : string;
  source     : string;
}

// ── BUFFER YAPISI ────────────────────────────────────────────
const MAX_LOG_BUFFER    = 100;
const MAX_METRIC_BUFFER = 50;

const logBuffer   : HatLogEntry[]    = [];
const metricBuffer: HatMetricEntry[] = [];

// ── ID ÜRETİCİ ──────────────────────────────────────────────
function hatId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
}

// ── TCP PUSH (net modülü — Turbopack uyumlu) ─────────────────
function tcpPush(queue: string, data: string): void {
  try {
    const client = net.createConnection(6379, '127.0.0.1', () => {
      const packet = JSON.stringify({
        type     : 'PUSH',
        key      : queue,
        payload  : data,
        timestamp: new Date().toISOString(),
      });
      client.write(packet);
      client.end();
    });
    client.on('error', () => {
      // Redis/Hub kapalıysa sessiz fail — sistem çökmesin
    });
  } catch {
    // Bağlantı hatası — sessiz fail
  }
}

// ══════════════════════════════════════════════════════════════
// 1. RED_LINE_TASKS — Plan Fırlatma (lpush)
// ══════════════════════════════════════════════════════════════

/**
 * Plan verisini RED_LINE_TASKS hattına fırlatır.
 * TCP bağlantısı + in-memory kayıt + audit.
 */
export function pushToRedLine(payload: HatPushPayload): { success: boolean; hat_id: string } {
  const id = hatId('RL');

  // TCP'ye gönder
  tcpPush('RED_LINE_TASKS', JSON.stringify({
    hat_id : id,
    type   : 'PLAN_PUSH',
    ...payload,
  }));

  // LOG_LINE'a da kayıt düş (Aktivite Akışı'nda görünür)
  pushLog({
    agent_id   : payload.assignee || 'SİSTEM',
    agent_name : payload.assignee ? `Ajan ${payload.assignee}` : 'PLANLAMA',
    katman     : 'KOMUTA',
    mesaj      : `📋 Plan fırlatıldı: ${payload.title}`,
    tip        : 'BASARI',
  });

  // DATA_LINE'a metrik düş (Canlı Metrikler'de görünür)
  pushMetric({
    metrik : 'PLAN_FIRLAT',
    deger  : 1,
    birim  : 'adet',
    kaynak : 'PLANLAMA_UI',
  });

  // Audit
  void logAudit({
    operation_type     : 'EXECUTE',
    action_description : `RED_LINE push: ${id} — ${payload.title}`,
    metadata           : { action_code: 'HAT_PUSH_RED_LINE', hat_id: id, plan_id: payload.plan_id },
  }).catch(() => {});

  return { success: true, hat_id: id };
}

// ══════════════════════════════════════════════════════════════
// 2. LOG_LINE — Aktivite Akışı Buffer
// ══════════════════════════════════════════════════════════════

export function pushLog(entry: Omit<HatLogEntry, 'id' | 'timestamp'>): HatLogEntry {
  const log: HatLogEntry = {
    id        : hatId('LOG'),
    timestamp : new Date().toISOString(),
    ...entry,
  };

  logBuffer.push(log);
  if (logBuffer.length > MAX_LOG_BUFFER) logBuffer.shift();

  // TCP'ye de gönder
  tcpPush('LOG_LINE', JSON.stringify(log));

  return log;
}

export function getLogBuffer(): HatLogEntry[] {
  return [...logBuffer].reverse();
}

// ══════════════════════════════════════════════════════════════
// 3. DATA_LINE — Canlı Metrikler Buffer
// ══════════════════════════════════════════════════════════════

export function pushMetric(entry: Omit<HatMetricEntry, 'id' | 'timestamp'>): HatMetricEntry {
  const metric: HatMetricEntry = {
    id        : hatId('DAT'),
    timestamp : new Date().toISOString(),
    ...entry,
  };

  metricBuffer.push(metric);
  if (metricBuffer.length > MAX_METRIC_BUFFER) metricBuffer.shift();

  // TCP'ye de gönder
  tcpPush('DATA_LINE', JSON.stringify(metric));

  return metric;
}

export function getMetricBuffer(): HatMetricEntry[] {
  return [...metricBuffer].reverse();
}

// ── TOPLAM İSTATİSTİKLER ─────────────────────────────────────
export function getHatStats() {
  const planFirlat = metricBuffer.filter(m => m.metrik === 'PLAN_FIRLAT').length;
  const logSayisi  = logBuffer.length;

  const tipDagilim = logBuffer.reduce((acc, l) => {
    acc[l.tip] = (acc[l.tip] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    red_line_push  : planFirlat,
    log_line_toplam: logSayisi,
    data_line_toplam: metricBuffer.length,
    tip_dagilim    : tipDagilim,
    son_log        : logBuffer.length > 0 ? logBuffer[logBuffer.length - 1]!.timestamp : null,
    son_metrik     : metricBuffer.length > 0 ? metricBuffer[metricBuffer.length - 1]!.timestamp : null,
  };
}
