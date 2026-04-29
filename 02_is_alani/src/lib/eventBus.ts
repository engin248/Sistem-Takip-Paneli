// ============================================================
// EVENT BUS — Hub Mesajlaşma Servisi (DB Destekli)
// ============================================================
// R1 DÜZELTMESİ: In-memory → DB okuma geçişi.
// Vercel serverless'da cold start sonrası veri kaybı engellendi.
//
// Yazma: In-memory + DB persist (hub_messages tablosu)
// Okuma: Önce DB, DB yoksa in-memory fallback
//
// Tablo: hub_messages (migration gerekli)
// ============================================================

import { supabase } from '@/lib/supabase';

export interface HubMessage {
  id: string;
  source?: string;
  target?: string;
  text: string;
  ts: string;
}

// ── In-memory fallback (DB erişilemezse) ─────────────────────
const MESSAGES: HubMessage[] = [];

function genId() { return `M-${String(MESSAGES.length + 1).padStart(4, '0')}-${Date.now().toString(36)}`; }

/**
 * Mesaj yayınla — in-memory + DB persist.
 */
export function publishMessage(payload: { source?: string; target?: string; text: string }): HubMessage {
  const msg: HubMessage = {
    id: genId(),
    source: payload.source,
    target: payload.target,
    text: payload.text,
    ts: new Date().toISOString(),
  };

  // In-memory (fallback için)
  MESSAGES.push(msg);
  if (MESSAGES.length > 200) MESSAGES.shift();

  // DB persist (best-effort — hata loglanır ama akış durmaz)
  void (async () => {
    try {
      await supabase.from('hub_messages').insert([{
        message_id: msg.id,
        source: msg.source || null,
        target: msg.target || null,
        text: msg.text,
        timestamp: msg.ts,
      }]);
    } catch {
      // Tablo yoksa veya DB erişim hatası — sessiz devam
      console.warn('[EventBus] hub_messages INSERT hatası — in-memory devam');
    }
  })();

  return msg;
}

/**
 * Son mesajları getir — DB'den okur, DB yoksa in-memory fallback.
 */
export async function getRecentMessagesAsync(limit = 50): Promise<HubMessage[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 200);
  
  try {
    const { data, error } = await supabase
      .from('hub_messages')
      .select('message_id, source, target, text, timestamp')
      .order('timestamp', { ascending: false })
      .limit(safeLimit);

    if (error) {
      // Tablo yoksa veya erişim hatası → in-memory fallback
      console.warn('[EventBus] hub_messages SELECT hatası — in-memory fallback:', error.message);
      return MESSAGES.slice(-safeLimit).reverse();
    }

    if (data && data.length > 0) {
      return data.map(row => ({
        id: row.message_id,
        source: row.source ?? undefined,
        target: row.target ?? undefined,
        text: row.text,
        ts: row.timestamp,
      }));
    }

    // DB boşsa in-memory'den dön (geçiş dönemi)
    return MESSAGES.slice(-safeLimit).reverse();
  } catch {
    // Bağlantı hatası → in-memory fallback
    return MESSAGES.slice(-safeLimit).reverse();
  }
}

/**
 * Senkron okuma — geriye uyumluluk (sadece in-memory).
 * Yeni kodda getRecentMessagesAsync() tercih edilmeli.
 */
export function getRecentMessages(limit = 50): HubMessage[] {
  return MESSAGES.slice(-limit).reverse();
}
