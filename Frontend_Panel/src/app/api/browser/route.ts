// ============================================================
// BROWSER API ROUTE — Web Tarama Endpoint
// ============================================================
// AI sisteminin dış dünyayı taraması için HTTP arayüzü.
//
// POST /api/browser
// Body:
//   { "action": "navigate", "url": "https://..." }
//   { "action": "search", "query": "...", "maxResults": 10 }
//   { "action": "screenshot", "url": "https://..." }
//   { "action": "extract", "url": "...", "selectors": {...} }
//
// GÜVENLİK: Sadece sunucu tarafında çalışır.
// Vercel'da ÇALIŞMAZ — Docker/VPS veya lokal geliştirme için.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  navigateAndExtract,
  searchWeb,
  takeScreenshot,
  extractStructuredData,
} from '@/services/browserService';
import { ERR, processError } from '@/lib/errorCore';
import { CONTROL } from '@/core/control_engine';
import { gorevOnKontrol } from '@/core/ruleGuard';
import { BrowserActionSchema, validateInput } from '@/lib/validation';

type BrowserAction = 'navigate' | 'search' | 'screenshot' | 'extract' | 'health';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // ── G-0 ZOD VALİDASYON (L0 + L1) ─────────────────────────
    const validation = validateInput(BrowserActionSchema, body, {
      kaynak: 'api/browser/route.ts',
      islem: 'BROWSER_API_PAYLOAD',
    });

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.errors?.join('; ') || 'Geçersiz payload' },
        { status: 400 }
      );
    }

    const validatedData = validation.data!;
    const { action } = validatedData;

    // ── SİSTEM KURALLARI: Giriş Kontrolü ───────────────────
    const kontrol = gorevOnKontrol('BROWSER_API', 'L1', JSON.stringify(validatedData));
    if (!kontrol.gecti) {
      return NextResponse.json(
        { success: false, error: `Sistem Kuralları: ${kontrol.aciklama}`, kural_no: kontrol.kural_no },
        { status: 403 }
      );
    }

    switch (action as BrowserAction) {
      // ── NAVIGATE: URL'ye git, içerik çıkar ─────────────────
      case 'navigate': {
        const { url } = validatedData as { url?: string };
        if (!url || !isValidUrl(url)) {
          return NextResponse.json(
            { success: false, error: 'Geçerli bir URL gereklidir.' },
            { status: 400 }
          );
        }

        const result = await navigateAndExtract(url);
        return NextResponse.json(result);
      }

      // ── SEARCH: Web araması yap ────────────────────────────
      case 'search': {
        const { query, maxResults } = validatedData as { query?: string; maxResults?: number };
        if (!query || typeof query !== 'string' || query.trim().length === 0) {
          return NextResponse.json(
            { success: false, error: 'Arama sorgusu (query) zorunludur.' },
            { status: 400 }
          );
        }

        const result = await searchWeb(query.trim(), maxResults || 10);
        return NextResponse.json(result);
      }

      // ── SCREENSHOT: Ekran görüntüsü al ────────────────────
      case 'screenshot': {
        const { url } = validatedData as { url?: string };
        if (!url || !isValidUrl(url)) {
          return NextResponse.json(
            { success: false, error: 'Geçerli bir URL gereklidir.' },
            { status: 400 }
          );
        }

        const result = await takeScreenshot(url);
        return NextResponse.json(result);
      }

      // ── EXTRACT: CSS seçicilerle veri çıkar ────────────────
      case 'extract': {
        const { url, selectors } = validatedData as {
          url?: string;
          selectors?: Record<string, string>;
        };

        if (!url || !isValidUrl(url)) {
          return NextResponse.json(
            { success: false, error: 'Geçerli bir URL gereklidir.' },
            { status: 400 }
          );
        }

        if (!selectors || typeof selectors !== 'object' || Object.keys(selectors).length === 0) {
          return NextResponse.json(
            { success: false, error: 'En az bir CSS seçici (selectors) gereklidir.' },
            { status: 400 }
          );
        }

        const result = await extractStructuredData({ url, selectors });
        return NextResponse.json(result);
      }

      // ── HEALTH: Playwright durumu ──────────────────────────
      case 'health': {
        const { isBrowserAvailable } = await import('@/services/browserService');
        const available = await isBrowserAvailable();
        return NextResponse.json({
          success: true,
          available,
          engine: 'Playwright Chromium (headless)',
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Bilinmeyen action: ${action}. Geçerli: navigate, search, screenshot, extract, health` },
          { status: 400 }
        );
    }
  } catch (error) {
    processError(ERR.BROWSER_NAVIGATE, error, {
      kaynak: 'api/browser/route.ts',
      islem: 'POST',
    });

    return NextResponse.json(
      { success: false, error: 'Browser işlemi sırasında hata oluştu.' },
      { status: 500 }
    );
  }
}

// ─── URL DOĞRULAMA ──────────────────────────────────────────

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}
