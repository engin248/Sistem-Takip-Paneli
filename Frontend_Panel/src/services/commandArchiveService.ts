// ============================================================
// KOMUT ARŞİV SERVİSİ — command_archive tablosu yönetimi
// ============================================================
// Her komut (panel/telegram/sesli) burada arşivlenir.
// Komut tamamlanana kadar veya 45 gün tutulur.
// G-8 öğrenme motoru bu tablodan beslenir.
//
// Akış:
//   1. Komut gelir → archiveCommand() ile kaydet
//   2. Görev oluşturulursa → updateCommandStatus('completed')
//   3. G-8 motoru → getCommandStats() ile pattern analizi
//   4. 45 gün sonra otomatik expire
//
// Hata Kodu: ERR-Sistem Takip Paneli001-001 (genel)
// ============================================================

import { supabase, validateSupabaseConnection } from '@/lib/supabase';
import { ERR, processError } from '@/lib/errorCore';

// ─── TİP TANIMLARI ──────────────────────────────────────────

export type CommandSource = 'panel' | 'telegram_text' | 'telegram_voice' | 'api';
export type CommandStatus = 'received' | 'processing' | 'completed' | 'failed' | 'rejected' | 'expired';

export interface CommandArchiveEntry {
  command_text: string;
  command_source: CommandSource;
  sender_name: string;
  sender_chat_id?: number | null;
  task_id?: string | null;
  task_code?: string | null;
  ai_priority?: string | null;
  ai_confidence?: number | null;
  ai_reasoning?: string | null;
  ai_source?: string | null;
  voice_confirmed?: boolean | null;
  voice_original_text?: string | null;
  metadata?: Record<string, unknown>;
}

export interface CommandStats {
  total_commands: number;
  by_source: Record<CommandSource, number>;
  by_status: Record<CommandStatus, number>;
  avg_completion_time_ms: number | null;
  most_active_sender: string;
  voice_confirmation_rate: number | null;
  recent_commands: CommandArchiveRecord[];
}

export interface CommandArchiveRecord extends CommandArchiveEntry {
  id: string;
  command_status: CommandStatus;
  created_at: string;
  completed_at: string | null;
  expires_at: string;
}

// ─── KOMUT ARŞİVLE ─────────────────────────────────────────

export async function archiveCommand(entry: CommandArchiveEntry): Promise<{
  success: boolean;
  id?: string;
  error?: string;
}> {
  if (!validateSupabaseConnection().isValid) {
    return { success: false, error: 'Veritabanı bağlantısı yok' };
  }

  try {
    const { data, error } = await supabase
      .from('command_archive')
      .insert([{
        command_text: entry.command_text,
        command_source: entry.command_source,
        command_status: 'received' as CommandStatus,
        sender_name: entry.sender_name,
        sender_chat_id: entry.sender_chat_id || null,
        task_id: entry.task_id || null,
        task_code: entry.task_code || null,
        ai_priority: entry.ai_priority || null,
        ai_confidence: entry.ai_confidence || null,
        ai_reasoning: entry.ai_reasoning || null,
        ai_source: entry.ai_source || null,
        voice_confirmed: entry.voice_confirmed ?? null,
        voice_original_text: entry.voice_original_text || null,
        metadata: entry.metadata || {},
      }])
      .select('id')
      .single();

    if (error) {
      processError(ERR.SYSTEM_GENERAL, error, {
        kaynak: 'commandArchiveService.ts',
        islem: 'ARCHIVE_INSERT',
      });
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (err) {
    processError(ERR.SYSTEM_GENERAL, err, {
      kaynak: 'commandArchiveService.ts',
      islem: 'ARCHIVE_INSERT',
    });
    return { success: false, error: String(err) };
  }
}

// ─── KOMUT DURUMU GÜNCELLE ──────────────────────────────────

export async function updateCommandStatus(
  commandId: string,
  status: CommandStatus,
  updates?: {
    task_id?: string;
    task_code?: string;
    ai_priority?: string;
    ai_confidence?: number;
    ai_reasoning?: string;
    ai_source?: string;
  }
): Promise<{ success: boolean }> {
  if (!validateSupabaseConnection().isValid) {
    return { success: false };
  }

  try {
    const updatePayload: Record<string, unknown> = {
      command_status: status,
    };

    if (status === 'completed' || status === 'failed') {
      updatePayload.completed_at = new Date().toISOString();
    }

    if (updates) {
      if (updates.task_id) updatePayload.task_id = updates.task_id;
      if (updates.task_code) updatePayload.task_code = updates.task_code;
      if (updates.ai_priority) updatePayload.ai_priority = updates.ai_priority;
      if (updates.ai_confidence != null) updatePayload.ai_confidence = updates.ai_confidence;
      if (updates.ai_reasoning) updatePayload.ai_reasoning = updates.ai_reasoning;
      if (updates.ai_source) updatePayload.ai_source = updates.ai_source;
    }

    const { error } = await supabase
      .from('command_archive')
      .update(updatePayload)
      .eq('id', commandId);

    if (error) {
      processError(ERR.SYSTEM_GENERAL, error, {
        kaynak: 'commandArchiveService.ts',
        islem: 'STATUS_UPDATE',
        command_id: commandId,
      });
      return { success: false };
    }

    return { success: true };
  } catch {
    return { success: false };
  }
}

// ─── KOMUT İSTATİSTİKLERİ (G-8 Öğrenme Motoru İçin) ───────

export async function getCommandStats(windowHours: number = 24 * 30): Promise<CommandStats | null> {
  if (!validateSupabaseConnection().isValid) return null;

  try {
    const since = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString();

    const { data: commands, error } = await supabase
      .from('command_archive')
      .select('*')
      .gte('created_at', since)
      .order('created_at', { ascending: false });

    if (error || !commands) return null;

    // Kaynak bazlı gruplama
    const bySource: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const senderCounts: Record<string, number> = {};
    let voiceTotal = 0;
    let voiceConfirmed = 0;
    let completionTimes: number[] = [];

    for (const cmd of commands) {
      // Source
      bySource[cmd.command_source] = (bySource[cmd.command_source] || 0) + 1;
      // Status
      byStatus[cmd.command_status] = (byStatus[cmd.command_status] || 0) + 1;
      // Sender
      senderCounts[cmd.sender_name] = (senderCounts[cmd.sender_name] || 0) + 1;
      // Voice confirmation rate
      if (cmd.command_source === 'telegram_voice') {
        voiceTotal++;
        if (cmd.voice_confirmed === true) voiceConfirmed++;
      }
      // Completion time
      if (cmd.completed_at && cmd.created_at) {
        const diff = new Date(cmd.completed_at).getTime() - new Date(cmd.created_at).getTime();
        if (diff > 0) completionTimes.push(diff);
      }
    }

    // En aktif gönderici
    const mostActive = Object.entries(senderCounts)
      .sort(([, a], [, b]) => b - a)[0];

    return {
      total_commands: commands.length,
      by_source: bySource as Record<CommandSource, number>,
      by_status: byStatus as Record<CommandStatus, number>,
      avg_completion_time_ms: completionTimes.length > 0
        ? Math.round(completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length)
        : null,
      most_active_sender: mostActive?.[0] ?? 'Yok',
      voice_confirmation_rate: voiceTotal > 0
        ? Math.round((voiceConfirmed / voiceTotal) * 100)
        : null,
      recent_commands: commands.slice(0, 10) as CommandArchiveRecord[],
    };
  } catch (err) {
    processError(ERR.SYSTEM_GENERAL, err, {
      kaynak: 'commandArchiveService.ts',
      islem: 'GET_STATS',
    });
    return null;
  }
}

// ─── ARŞİV SORGUSU — Görev bazlı ───────────────────────────

export async function getCommandsByTask(taskId: string): Promise<CommandArchiveRecord[]> {
  if (!validateSupabaseConnection().isValid) return [];

  try {
    const { data, error } = await supabase
      .from('command_archive')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data as CommandArchiveRecord[];
  } catch {
    return [];
  }
}
