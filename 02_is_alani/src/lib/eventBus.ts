// src/lib/eventBus.ts
// Simple in-memory event bus for dev: publish messages and read recent
export interface HubMessage {
  id: string;
  source?: string;
  target?: string;
  text: string;
  ts: string;
}

const MESSAGES: HubMessage[] = [];

function genId() { return `M-${String(MESSAGES.length + 1).padStart(4, '0')}`; }

export function publishMessage(payload: { source?: string; target?: string; text: string }): HubMessage {
  const msg: HubMessage = { id: genId(), source: payload.source, target: payload.target, text: payload.text, ts: new Date().toISOString() };
  MESSAGES.push(msg);
  // keep last 200
  if (MESSAGES.length > 200) MESSAGES.shift();
  return msg;
}

export function getRecentMessages(limit = 50): HubMessage[] {
  return MESSAGES.slice(-limit).reverse();
}
