// ============================================================
// SELF-LEARNING ENGINE — G-8 PATTERN MOTORU
// ============================================================
// Görev: Geçmiş hata kayıtlarından pattern öğrenip tekrar
// eden hataları otomatik tespit ve sınıflandırma.
//
// Akış:
//   1. audit_logs'tan hata kayıtlarını çek
//   2. error_code bazlı frekans analizi yap
//   3. Zaman bazlı trend hesapla
//   4. Tekrar eden pattern'leri raporla
//   5. Anomali tespiti (ortalama üstü yoğunluk)
//
// ÜST: audit_logs tablosu (okuma)
// ALT: Supabase select
// YAN: errorCore hata kodu sözlüğü
// ÖN: Proaktif hata önleme
// ARKA: Makine öğrenimi temeli (Faz-4 için hazırlık)
//
// Hata Kodu: ERR-STP001-001 (genel)
// ============================================================

import { supabase, validateSupabaseConnection } from '@/lib/supabase';
import { ERR, processError } from '@/lib/errorCore';
import { logAudit } from './auditService';

// ─── TİP TANIMLARI ──────────────────────────────────────────

export interface ErrorPattern {
  error_code: string;
  count: number;
  first_seen: string;
  last_seen: string;
  trend: 'INCREASING' | 'STABLE' | 'DECREASING';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  sources: string[];
}

export interface AnomalyDetection {
  type: 'SPIKE' | 'RECURRING' | 'NEW_ERROR';
  error_code: string;
  description: string;
  confidence: number;
  detected_at: string;
}

export interface LearningReport {
  engine: 'G-8-SELF-LEARNING';
  timestamp: string;
  duration_ms: number;
  analysis_window_hours: number;
  total_errors_analyzed: number;
  patterns: ErrorPattern[];
  anomalies: AnomalyDetection[];
  recommendations: string[];
}

// ============================================================
// 1. HATA FREKANS ANALİZİ
// ============================================================

async function analyzeErrorFrequency(windowHours: number): Promise<{
  patterns: ErrorPattern[];
  totalErrors: number;
}> {
  const patterns: ErrorPattern[] = [];
  const since = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString();

  try {
    const { data: logs, error } = await supabase
      .from('audit_logs')
      .select('error_code, error_severity, created_at, metadata')
      .not('error_code', 'is', null)
      .gte('created_at', since)
      .order('created_at', { ascending: true });

    if (error || !logs) return { patterns, totalErrors: 0 };

    // error_code bazlı gruplama
    const codeMap = new Map<string, {
      count: number;
      first: string;
      last: string;
      sources: Set<string>;
      timestamps: number[];
    }>();

    for (const log of logs) {
      const code = log.error_code as string;
      const existing = codeMap.get(code);
      const source = (log.metadata as Record<string, string>)?.kaynak || 'bilinmeyen';
      const ts = new Date(log.created_at).getTime();

      if (existing) {
        existing.count++;
        existing.last = log.created_at;
        existing.sources.add(source);
        existing.timestamps.push(ts);
      } else {
        codeMap.set(code, {
          count: 1,
          first: log.created_at,
          last: log.created_at,
          sources: new Set([source]),
          timestamps: [ts],
        });
      }
    }

    // Pattern oluşturma
    for (const [code, data] of codeMap.entries()) {
      // Trend hesaplama — ilk yarı vs son yarı karşılaştırma
      const mid = Math.floor(data.timestamps.length / 2);
      const firstHalf = data.timestamps.slice(0, mid).length;
      const secondHalf = data.timestamps.slice(mid).length;

      let trend: ErrorPattern['trend'] = 'STABLE';
      if (secondHalf > firstHalf * 1.5) trend = 'INCREASING';
      else if (firstHalf > secondHalf * 1.5) trend = 'DECREASING';

      // Severity hesaplama
      let severity: ErrorPattern['severity'] = 'LOW';
      if (data.count >= 20) severity = 'CRITICAL';
      else if (data.count >= 10) severity = 'HIGH';
      else if (data.count >= 5) severity = 'MEDIUM';

      patterns.push({
        error_code: code,
        count: data.count,
        first_seen: data.first,
        last_seen: data.last,
        trend,
        severity,
        sources: Array.from(data.sources),
      });
    }

    // Frekansa göre sırala
    patterns.sort((a, b) => b.count - a.count);

    return { patterns, totalErrors: logs.length };
  } catch (err) {
    processError(ERR.SYSTEM_GENERAL, err, {
      kaynak: 'selfLearningEngine.ts',
      islem: 'ANALYZE_FREQUENCY',
    });
    return { patterns, totalErrors: 0 };
  }
}

// ============================================================
// 2. ANOMALİ TESPİTİ
// ============================================================

function detectAnomalies(patterns: ErrorPattern[]): AnomalyDetection[] {
  const anomalies: AnomalyDetection[] = [];

  if (patterns.length === 0) return anomalies;

  // Ortalama hata sayısı
  const avgCount = patterns.reduce((sum, p) => sum + p.count, 0) / patterns.length;

  for (const pattern of patterns) {
    // SPIKE: Ortalama üstü 3x
    if (pattern.count > avgCount * 3) {
      anomalies.push({
        type: 'SPIKE',
        error_code: pattern.error_code,
        description: `"${pattern.error_code}" hatası ortalamanın ${Math.round(pattern.count / avgCount)}x üstünde (${pattern.count} kez).`,
        confidence: Math.min(1.0, 0.5 + (pattern.count / avgCount) * 0.1),
        detected_at: new Date().toISOString(),
      });
    }

    // RECURRING: Artan trend + 5+ tekrar
    if (pattern.trend === 'INCREASING' && pattern.count >= 5) {
      anomalies.push({
        type: 'RECURRING',
        error_code: pattern.error_code,
        description: `"${pattern.error_code}" hatası artış trendinde ve ${pattern.count} kez tekrar etti.`,
        confidence: 0.7,
        detected_at: new Date().toISOString(),
      });
    }
  }

  return anomalies;
}

// ============================================================
// 3. ÖNERİ ÜRETME
// ============================================================

function generateRecommendations(patterns: ErrorPattern[], anomalies: AnomalyDetection[]): string[] {
  const recommendations: string[] = [];

  // Kritik pattern'ler
  const critical = patterns.filter(p => p.severity === 'CRITICAL');
  if (critical.length > 0) {
    recommendations.push(
      `${critical.length} adet KRİTİK seviye hata pattern'i tespit edildi. Acil müdahale önerilir: ${critical.map(c => c.error_code).join(', ')}`
    );
  }

  // Artan trendler
  const increasing = patterns.filter(p => p.trend === 'INCREASING');
  if (increasing.length > 0) {
    recommendations.push(
      `${increasing.length} hata kodu artış trendinde. Kök neden analizi yapılmalı: ${increasing.map(i => i.error_code).join(', ')}`
    );
  }

  // Spike anomalileri
  const spikes = anomalies.filter(a => a.type === 'SPIKE');
  if (spikes.length > 0) {
    recommendations.push(
      `${spikes.length} adet ani artış (spike) tespit edildi. Sistem yükü veya hata kaynağı kontrol edilmeli.`
    );
  }

  // Hiç bulgu yoksa
  if (recommendations.length === 0) {
    recommendations.push('Sistem sağlıklı. Tespit edilen anormal pattern bulunmuyor.');
  }

  return recommendations;
}

// ============================================================
// ANA ORKESTRATÖR
// ============================================================

export async function runSelfLearning(windowHours: number = 24): Promise<LearningReport> {
  const startTime = Date.now();

  if (!validateSupabaseConnection().isValid) {
    return {
      engine: 'G-8-SELF-LEARNING',
      timestamp: new Date().toISOString(),
      duration_ms: 0,
      analysis_window_hours: windowHours,
      total_errors_analyzed: 0,
      patterns: [],
      anomalies: [],
      recommendations: ['Supabase bağlantısı yok. Analiz yapılamaz.'],
    };
  }

  // 1. Frekans analizi
  const { patterns, totalErrors } = await analyzeErrorFrequency(windowHours);

  // 2. Anomali tespiti
  const anomalies = detectAnomalies(patterns);

  // 3. Öneriler
  const recommendations = generateRecommendations(patterns, anomalies);

  const duration_ms = Date.now() - startTime;

  const report: LearningReport = {
    engine: 'G-8-SELF-LEARNING',
    timestamp: new Date().toISOString(),
    duration_ms,
    analysis_window_hours: windowHours,
    total_errors_analyzed: totalErrors,
    patterns,
    anomalies,
    recommendations,
  };

  // Raporu audit log'a mühürle
  await logAudit({
    operation_type: 'EXECUTE',
    action_description: `G-8 Self-Learning tamamlandı: ${totalErrors} hata analiz edildi, ${patterns.length} pattern, ${anomalies.length} anomali — ${duration_ms}ms`,
    metadata: {
      action_code: 'SELF_LEARNING_ANALYSIS',
      total_errors: totalErrors,
      pattern_count: patterns.length,
      anomaly_count: anomalies.length,
      recommendation_count: recommendations.length,
      window_hours: windowHours,
      duration_ms,
      top_errors: patterns.slice(0, 5).map(p => ({ code: p.error_code, count: p.count })),
    },
  }).catch(() => {});

  return report;
}
