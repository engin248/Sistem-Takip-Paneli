// ============================================================
// BROWSER SERVICE — Playwright Web Tarama Köprüsü
// ============================================================
// AI sisteminin dış dünyayı (web) tarayabilmesi için köprü.
// Playwright Chromium headless ile çalışır.
//
// KAPASİTELER:
//   1. navigateAndExtract — URL'ye git, içerik çıkar
//   2. searchWeb — Arama motoru sorgusu yap, sonuçları çek
//   3. takeScreenshot — Sayfa ekran görüntüsü al
//   4. extractStructuredData — CSS seçicilerle veri çıkar
//
// KISITLAMALAR:
//   - Sadece SERVER-SIDE (API Routes) çağrılabilir
//   - Vercel serverless'ta Chromium ÇALIŞTIRILAMAZ
//     → Docker/VPS veya lokal geliştirme için tasarlanmıştır
//   - Her oturum sonrası browser kapatılır (kaynak sızıntısı önlemi)
//
// Hata Kodları:
//   ERR-STP001-026 → Tarayıcı başlatılamadı
//   ERR-STP001-027 → Sayfa navigasyonu başarısız
//   ERR-STP001-028 → Sayfa içerik çıkarma hatası
// ============================================================

import { chromium, type Browser, type Page, type BrowserContext, type Route } from 'playwright';
import { ERR, processError } from '@/lib/errorCore';
import { logAudit } from './auditService';
import { CONTROL } from '@/core/control_engine';

// ─── YAPILANDIRMA ───────────────────────────────────────────

const BROWSER_CONFIG = {
  /** Navigasyon timeout (ms) */
  navigationTimeout: 30_000,
  /** Sayfa yükleme bekleme süresi (ms) */
  waitAfterLoad: 2_000,
  /** Maksimum içerik uzunluğu (karakter) */
  maxContentLength: 50_000,
  /** User-Agent */
  userAgent: 'STP-BrowserService/1.0 (Playwright; Headless Chromium)',
  /** Viewport boyutu */
  viewport: { width: 1280, height: 720 },
} as const;

// ─── TİP TANIMLARI ──────────────────────────────────────────

export interface BrowseResult {
  success: boolean;
  url: string;
  title: string;
  content: string;
  metadata: PageMetadata;
  error?: string;
  durationMs: number;
}

export interface PageMetadata {
  /** Sayfa başlığı */
  title: string;
  /** Meta description */
  description: string;
  /** Open Graph başlığı */
  ogTitle: string;
  /** Sayfa dili */
  lang: string;
  /** Canonical URL */
  canonical: string;
  /** Tespit edilen bağlantı sayısı */
  linkCount: number;
  /** HTTP durum kodu */
  statusCode: number;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface SearchResponse {
  success: boolean;
  query: string;
  results: SearchResult[];
  resultCount: number;
  error?: string;
  durationMs: number;
}

export interface ScreenshotResult {
  success: boolean;
  url: string;
  /** Base64 encoded PNG */
  imageBase64: string;
  error?: string;
  durationMs: number;
}

export interface StructuredDataRequest {
  url: string;
  selectors: Record<string, string>;
}

export interface StructuredDataResult {
  success: boolean;
  url: string;
  data: Record<string, string | null>;
  error?: string;
  durationMs: number;
}

// ─── TARAYICI YÖNETİMİ ─────────────────────────────────────
// Her işlem kendi browser instance'ını oluşturur ve kapatır.
// Singleton pattern KULLANILMAZ — kaynak sızıntısı riski.
// ─────────────────────────────────────────────────────────────

async function createBrowser(): Promise<Browser> {
  try {
    const browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-sync',
        '--disable-translate',
        '--no-first-run',
      ],
    });
    return browser;
  } catch (error) {
    processError(ERR.BROWSER_LAUNCH, error, {
      kaynak: 'browserService.ts',
      islem: 'CHROMIUM_LAUNCH',
    }, 'CRITICAL');
    throw error;
  }
}

async function createContext(browser: Browser): Promise<BrowserContext> {
  return browser.newContext({
    userAgent: BROWSER_CONFIG.userAgent,
    viewport: BROWSER_CONFIG.viewport,
    locale: 'tr-TR',
    timezoneId: 'Europe/Istanbul',
    // Güvenlik: JavaScript etkin, ama medya/resimler opsiyonel
    javaScriptEnabled: true,
    ignoreHTTPSErrors: true,
  });
}

// ─── GÜVENLI KAPATMA ────────────────────────────────────────

async function safeClose(browser: Browser | null, context: BrowserContext | null, page: Page | null): Promise<void> {
  try {
    if (page && !page.isClosed()) await page.close();
  } catch { /* sessiz */ }
  try {
    if (context) await context.close();
  } catch { /* sessiz */ }
  try {
    if (browser && browser.isConnected()) await browser.close();
  } catch { /* sessiz */ }
}

// ============================================================
// 1. NAVIGATE AND EXTRACT — URL'ye git, içerik çıkar
// ============================================================
// Belirtilen URL'ye gider, DOM yüklendikten sonra:
//   - Sayfa başlığı, meta bilgileri çıkarır
//   - Görünür metin içeriğini çıkarır (HTML temizlenmiş)
//   - Bağlantı sayısını hesaplar
// ============================================================

export async function navigateAndExtract(url: string): Promise<BrowseResult> {
  const startTime = Date.now();

  // L0 GATEKEEPER KONTROLÜ
  const control = CONTROL('BROWSER_REQUEST', url);
  if (!control.pass) {
    processError(ERR.SYSTEM_GENERAL, new Error(`Browser URL Zırh İhlali: ${control.reason}`), {
      kaynak: 'browserService.ts',
      islem: 'NAVIGATE_AND_EXTRACT',
      hatalar: [control.reason]
    }, 'WARNING');
    return {
      success: false,
      url,
      title: '',
      content: '',
      metadata: { title: '', description: '', ogTitle: '', lang: '', canonical: '', linkCount: 0, statusCode: 0 },
      error: `Geçersiz URL: ${control.reason}`,
      durationMs: Date.now() - startTime
    };
  }

  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;

  try {
    // İŞLEM ÖNCESİ KANIT KAYDI
    await logAudit({
      operation_type: 'EXECUTE',
      action_description: `AR-GE BİLGİ TOPLAMASI BAŞLADI: ${url}`,
      metadata: { action_code: 'BROWSER_START', url }
    }).catch(() => {});

    browser = await createBrowser();
    context = await createContext(browser);
    page = await context.newPage();

    // SIKIYÖNETİM: SADECE OKUMA (READ-ONLY) MÜHRÜ
    // Dışarı çıkan tarayıcı form dolduramaz, butonla veri silemez (Sadece GET izni).
    await page.route('**/*', (route: Route) => {
      const request = route.request();
      if (request.method() !== 'GET') {
        // GET dışındaki tüm istekler (POST, PUT, DELETE) otonom engellenir.
        route.abort('blockedbyclient');
      } else {
        route.continue();
      }
    });

    // Navigasyon
    const response = await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: BROWSER_CONFIG.navigationTimeout,
    });

    const statusCode = response?.status() ?? 0;

    // Sayfa yüklenme bekleme
    await page.waitForTimeout(BROWSER_CONFIG.waitAfterLoad);

    // Meta bilgileri çıkar
    const metadata = await extractMetadata(page, statusCode);

    // Görünür metin içeriği çıkar
    const rawContent = await page.evaluate(() => {
      // Script/style/nav etiketlerini çıkar
      const removeSelectors = ['script', 'style', 'nav', 'footer', 'header', 'noscript', 'iframe'];
      removeSelectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => el.remove());
      });

      // Görünür body metni
      return document.body?.innerText || '';
    });

    // İçerik boyutunu sınırla
    const content = rawContent.substring(0, BROWSER_CONFIG.maxContentLength);

    const durationMs = Date.now() - startTime;

    // Audit log
    await logAudit({
      operation_type: 'READ',
      action_description: `Browser tarama: ${url} (${statusCode}) — ${content.length} karakter`,
      metadata: {
        action_code: 'BROWSER_NAVIGATE',
        url,
        status_code: statusCode,
        content_length: content.length,
        duration_ms: durationMs,
      },
    }).catch(() => {});

    return {
      success: true,
      url,
      title: metadata.title,
      content,
      metadata,
      durationMs,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    processError(ERR.BROWSER_NAVIGATE, error, {
      kaynak: 'browserService.ts',
      islem: 'NAVIGATE_AND_EXTRACT',
      url,
    });
    return {
      success: false,
      url,
      title: '',
      content: '',
      metadata: emptyMetadata(),
      error: error instanceof Error ? error.message : String(error),
      durationMs,
    };
  } finally {
    await safeClose(browser, context, page);
  }
}

// ============================================================
// 2. SEARCH WEB — Arama Motoru Sorgusu
// ============================================================
// DuckDuckGo HTML lite üzerinden arama yapar.
// Google yerine DDG tercih edildi — bot dostu, CAPTCHA yok.
// ============================================================

export async function searchWeb(query: string, maxResults: number = 10): Promise<SearchResponse> {
  const startTime = Date.now();
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;

  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

  try {
    browser = await createBrowser();
    context = await createContext(browser);
    page = await context.newPage();

    await page.goto(searchUrl, {
      waitUntil: 'domcontentloaded',
      timeout: BROWSER_CONFIG.navigationTimeout,
    });

    await page.waitForTimeout(1500);

    // Arama sonuçlarını çıkar
    const results = await page.evaluate((limit: number) => {
      const items: { title: string; url: string; snippet: string }[] = [];
      const resultElements = document.querySelectorAll('.result');

      for (let i = 0; i < Math.min(resultElements.length, limit); i++) {
        const el = resultElements[i];
        if (!el) continue;
        const titleEl = el.querySelector('.result__title a, .result__a');
        const snippetEl = el.querySelector('.result__snippet');
        const urlEl = el.querySelector('.result__url');

        if (titleEl) {
          items.push({
            title: titleEl.textContent?.trim() || '',
            url: (titleEl as HTMLAnchorElement).href || urlEl?.textContent?.trim() || '',
            snippet: snippetEl?.textContent?.trim() || '',
          });
        }
      }
      return items;
    }, maxResults);

    const durationMs = Date.now() - startTime;

    // Audit log
    await logAudit({
      operation_type: 'READ',
      action_description: `Browser arama: "${query}" — ${results.length} sonuç`,
      metadata: {
        action_code: 'BROWSER_SEARCH',
        query,
        result_count: results.length,
        duration_ms: durationMs,
      },
    }).catch(() => {});

    return {
      success: true,
      query,
      results,
      resultCount: results.length,
      durationMs,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    processError(ERR.BROWSER_EXTRACT, error, {
      kaynak: 'browserService.ts',
      islem: 'SEARCH_WEB',
      query,
    });
    return {
      success: false,
      query,
      results: [],
      resultCount: 0,
      error: error instanceof Error ? error.message : String(error),
      durationMs,
    };
  } finally {
    await safeClose(browser, context, page);
  }
}

// ============================================================
// 3. TAKE SCREENSHOT — Sayfa Ekran Görüntüsü
// ============================================================

export async function takeScreenshot(url: string): Promise<ScreenshotResult> {
  const startTime = Date.now();
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;

  try {
    browser = await createBrowser();
    context = await createContext(browser);
    page = await context.newPage();

    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: BROWSER_CONFIG.navigationTimeout,
    });

    await page.waitForTimeout(BROWSER_CONFIG.waitAfterLoad);

    const screenshotBuffer = await page.screenshot({
      type: 'png',
      fullPage: false,
    });

    const imageBase64 = screenshotBuffer.toString('base64');
    const durationMs = Date.now() - startTime;

    // Audit log
    await logAudit({
      operation_type: 'EXECUTE',
      action_description: `Browser screenshot: ${url}`,
      metadata: {
        action_code: 'BROWSER_SCREENSHOT',
        url,
        image_size_bytes: screenshotBuffer.length,
        duration_ms: durationMs,
      },
    }).catch(() => {});

    return {
      success: true,
      url,
      imageBase64,
      durationMs,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    processError(ERR.BROWSER_NAVIGATE, error, {
      kaynak: 'browserService.ts',
      islem: 'SCREENSHOT',
      url,
    });
    return {
      success: false,
      url,
      imageBase64: '',
      error: error instanceof Error ? error.message : String(error),
      durationMs,
    };
  } finally {
    await safeClose(browser, context, page);
  }
}

// ============================================================
// 4. EXTRACT STRUCTURED DATA — CSS Seçicilerle Veri Çıkarma
// ============================================================
// Belirli CSS seçicilere göre sayfadan yapılandırılmış veri çıkarır.
// Örnek: { "baslik": "h1", "fiyat": ".price", "aciklama": ".desc" }
// ============================================================

export async function extractStructuredData(request: StructuredDataRequest): Promise<StructuredDataResult> {
  const startTime = Date.now();
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;

  try {
    browser = await createBrowser();
    context = await createContext(browser);
    page = await context.newPage();

    await page.goto(request.url, {
      waitUntil: 'domcontentloaded',
      timeout: BROWSER_CONFIG.navigationTimeout,
    });

    await page.waitForTimeout(BROWSER_CONFIG.waitAfterLoad);

    // Her seçici için veri çıkar
    const data: Record<string, string | null> = {};

    for (const [key, selector] of Object.entries(request.selectors)) {
      try {
        const element = await page.$(selector);
        data[key] = element ? await element.textContent() : null;
      } catch {
        data[key] = null;
      }
    }

    const durationMs = Date.now() - startTime;

    // Audit log
    await logAudit({
      operation_type: 'READ',
      action_description: `Browser veri çıkarma: ${request.url} — ${Object.keys(request.selectors).length} seçici`,
      metadata: {
        action_code: 'BROWSER_EXTRACT',
        url: request.url,
        selectors: Object.keys(request.selectors),
        extracted_keys: Object.keys(data).filter(k => data[k] !== null),
        duration_ms: durationMs,
      },
    }).catch(() => {});

    return {
      success: true,
      url: request.url,
      data,
      durationMs,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    processError(ERR.BROWSER_EXTRACT, error, {
      kaynak: 'browserService.ts',
      islem: 'EXTRACT_STRUCTURED',
      url: request.url,
    });
    return {
      success: false,
      url: request.url,
      data: {},
      error: error instanceof Error ? error.message : String(error),
      durationMs,
    };
  } finally {
    await safeClose(browser, context, page);
  }
}

// ============================================================
// 5. YARDIMCI FONKSİYONLAR
// ============================================================

/** Sayfa meta bilgilerini çıkarır */
async function extractMetadata(page: Page, statusCode: number): Promise<PageMetadata> {
  try {
    return await page.evaluate((sc: number) => {
      const getMeta = (name: string): string => {
        const el = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
        return el?.getAttribute('content') || '';
      };

      const links = document.querySelectorAll('a[href]');
      const canonical = document.querySelector('link[rel="canonical"]');

      return {
        title: document.title || '',
        description: getMeta('description'),
        ogTitle: getMeta('og:title'),
        lang: document.documentElement.lang || '',
        canonical: canonical?.getAttribute('href') || '',
        linkCount: links.length,
        statusCode: sc,
      };
    }, statusCode);
  } catch {
    return emptyMetadata();
  }
}

/** Boş metadata üretir — hata durumları için */
function emptyMetadata(): PageMetadata {
  return {
    title: '',
    description: '',
    ogTitle: '',
    lang: '',
    canonical: '',
    linkCount: 0,
    statusCode: 0,
  };
}

/** Playwright kurulu mu kontrol eder */
export async function isBrowserAvailable(): Promise<boolean> {
  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({ headless: true });
    return true;
  } catch {
    return false;
  } finally {
    if (browser && browser.isConnected()) {
      await browser.close();
    }
  }
}
