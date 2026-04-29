// ============================================================
// /api/agents/chat — Ajan ile Ollama üzerinden chat
// POST: { agentId, agentCodename, agentRole, message, history }
// → Ollama (llama3:latest) cevabını döner
// ============================================================

import { NextRequest, NextResponse } from 'next/server';

const OLLAMA_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3:latest';

export async function POST(req: NextRequest) {
  try {
    const { agentCodename, agentRole, agentTier, message, history = [] } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Mesaj boş olamaz' }, { status: 400 });
    }

    const systemPrompt = agentRole
      ? `Sen ${agentCodename} adlı bir yapay zeka ajansısın. ${agentTier} departmanında çalışıyorsun. Görevin: ${agentRole}. Türkçe yanıt ver. Kısa ve net ol.`
      : `Sen ${agentCodename} adlı bir yapay zeka ajanısın. ${agentTier || 'GENEL'} departmanında çalışıyorsun. Kullanıcının sorularını Türkçe olarak yanıtla.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-6), // Son 6 mesaj
      { role: 'user', content: message },
    ];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const ollamaRes = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: OLLAMA_MODEL, messages, stream: false, options: { temperature: 0.7, num_predict: 300 } }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!ollamaRes.ok) {
      throw new Error(`Ollama HTTP ${ollamaRes.status}`);
    }

    const data = await ollamaRes.json() as { message?: { content?: string } };
    const reply = data.message?.content || 'Yanıt alınamadı.';

    return NextResponse.json({ reply, model: OLLAMA_MODEL, agent: agentCodename });
  } catch (err: any) {
    console.error('[API/agents/chat]', err);
    if (err.name === 'AbortError') {
      return NextResponse.json({ error: 'Ollama zaman aşımı (30s)', reply: 'Bağlantı zaman aşımına uğradı. Ollama çalışıyor mu?' }, { status: 504 });
    }
    return NextResponse.json({ error: err.message, reply: `Sistem hatası: ${err.message}` }, { status: 500 });
  }
}
