// ============================================================
// BROWSERLESS ADAPTER — Playwright → HTTP API Geçişi
// ============================================================
// Vercel serverless ortamında Playwright ÇALIŞMAZ (~100MB binary).
// Bu modül, Browserless.io HTTP API'sine geçiş sağlar.
//
// Kullanım:
//   BROWSERLESS_API_URL=https://chrome.browserless.io
//   BROWSERLESS_API_TOKEN=your-token
//
// Playwright mevcut değilse bu adapter devreye girer.
//
// ÜST: browserService.ts → bu adapter'ı çağırır
// ALT: HTTP fetch — dış bağımlılık YOK
// YAN: browser/route.ts API'si aynı kalır
// ÖN: Vercel deploy uyumlu
// ARKA: Browserless.io SaaS — ücretli (ücretsiz 6 saat/ay)
//
// Hata Kodu: ERR-Sistem Takip Paneli001-001 (genel)
// ============================================================

import { ERR, processError } from '@/lib/errorCore';

const BROWSERLESS_URL = process.env.BROWSERLESS_API_URL || '';
const BROWSERLESS_TOKEN = process.env.BROWSERLESS_API_TOKEN || '';

// ─── DURUM KONTROLÜ ─────────────────────────────────────────

export function isBrowserlessAvailable(): boolean {
  return !!(BROWSERLESS_URL && BROWSERLESS_TOKEN);
}

// ─── SAYFA İÇERİK ÇIKARMA ──────────────────────────────────

export async function browserlessNavigate(url: string): Promise<{
  success: boolean;
  title?: string;
  text?: string;
  error?: string;
}> {
  if (!isBrowserlessAvailable()) {
    return { success: false, error: 'Browserless yapılandırılmamış' };
  }

  try {
    const response = await fetch(`${BROWSERLESS_URL}/content?token=${BROWSERLESS_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        waitFor: 3000,
      }),
    });

    if (!response.ok) {
      throw new Error(`Browserless HTTP ${response.status}`);
    }

    const html = await response.text();

    // Basit title çıkarma
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
    const title = titleMatch?.[1] || '';

    // Basit metin çıkarma (tag'ları kaldır)
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 5000);

    return { success: true, title, text };
  } catch (error) {
    processError(ERR.SYSTEM_GENERAL, error, {
      kaynak: 'browserlessAdapter.ts',
      islem: 'NAVIGATE',
      url,
    });
    return { success: false, error: String(error) };
  }
}

// ─── EKRAN GÖRÜNTÜSÜ ───────────────────────────────────────

export async function browserlessScreenshot(url: string): Promise<{
  success: boolean;
  screenshot?: string;
  error?: string;
}> {
  if (!isBrowserlessAvailable()) {
    return { success: false, error: 'Browserless yapılandırılmamış' };
  }

  try {
    const response = await fetch(`${BROWSERLESS_URL}/screenshot?token=${BROWSERLESS_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        options: {
          fullPage: false,
          type: 'png',
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Browserless screenshot HTTP ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    return { success: true, screenshot: `data:image/png;base64,${base64}` };
  } catch (error) {
    processError(ERR.SYSTEM_GENERAL, error, {
      kaynak: 'browserlessAdapter.ts',
      islem: 'SCREENSHOT',
      url,
    });
    return { success: false, error: String(error) };
  }
}

// ─── PDF OLUŞTURMA ──────────────────────────────────────────

export async function browserlessPDF(url: string): Promise<{
  success: boolean;
  pdf?: string;
  error?: string;
}> {
  if (!isBrowserlessAvailable()) {
    return { success: false, error: 'Browserless yapılandırılmamış' };
  }

  try {
    const response = await fetch(`${BROWSERLESS_URL}/pdf?token=${BROWSERLESS_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      throw new Error(`Browserless PDF HTTP ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    return { success: true, pdf: `data:application/pdf;base64,${base64}` };
  } catch (error) {
    processError(ERR.SYSTEM_GENERAL, error, {
      kaynak: 'browserlessAdapter.ts',
      islem: 'PDF',
      url,
    });
    return { success: false, error: String(error) };
  }
}
