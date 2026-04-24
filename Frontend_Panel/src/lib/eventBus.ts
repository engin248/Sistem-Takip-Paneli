// ============================================================
// EVENT BUS — Hub Mesajlaşma Servisi (YEREL)
// ============================================================
// SUPABASE SÖKÜLMÜŞTÜR. Tüm mesajlar in-memory kalır.
// Veri dışarı çıkmaz.
// ============================================================

export interface HubMessage {
  id: string;
  source?: string;
  target?: string;
  text: string;
  ts: string;
}

const MESSAGES: HubMessage[] = [];

function genId() { return `M-${String(MESSAGES.length + 1).padStart(4, '0')}-${Date.now().toString(36)}`; }

/**
 * Mesaj yayınla — sadece yerel hafıza.
 */
export function publishMessage(payload: { source?: string; target?: string; text: string }): HubMessage {
  const msg: HubMessage = {
    id: genId(),
    source: payload.source,
    target: payload.target,
    text: payload.text,
    ts: new Date().toISOString(),
  };

  MESSAGES.push(msg);
  if (MESSAGES.length > 200) MESSAGES.shift();

  return msg;
}

/**
 * Son mesajları getir — yerel hafızadan.
 */
export async function getRecentMessagesAsync(limit = 50): Promise<HubMessage[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 200);
  return MESSAGES.slice(-safeLimit).reverse();
}

/**
 * Senkron okuma.
 */
export function getRecentMessages(limit = 50): HubMessage[] {
  return MESSAGES.slice(-limit).reverse();
}
