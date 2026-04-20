// ============================================================
// E2E TEST — API ENDPOINT'LERİ
// ============================================================
// Tüm API route'larının HTTP düzeyinde doğrulaması.
// GET endpoint'leri → 200 + JSON yapı kontrolü
// POST endpoint'leri → input validasyonu + hata kontrolleri
// ============================================================

import { test, expect } from '@playwright/test';

test.describe('API — Health Check', () => {
  test('GET /api/health-check → 200 veya 207 veya 503 + JSON yapısı', async ({ request }) => {
    const res = await request.get('/api/health-check');
    // Herhangi bir durum kabul edilir (healthy=200, degraded=207, down=503)
    expect([200, 207, 503]).toContain(res.status());

    const body = await res.json();
    expect(body).toHaveProperty('status');
    expect(body).toHaveProperty('timestamp');
    expect(body).toHaveProperty('systems');
    expect(body).toHaveProperty('mizanet');
    expect(Array.isArray(body.systems)).toBe(true);
  });
});

test.describe('API — Validate (L2 Denetim)', () => {
  test('GET /api/validate → 200 + success + report', async ({ request }) => {
    const res = await request.get('/api/validate');
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty('success', true);
    expect(body).toHaveProperty('report');
    expect(body.report).toHaveProperty('summary');
  });
});

test.describe('API — Self Learning', () => {
  test('GET /api/learn → 200 + success + report', async ({ request }) => {
    const res = await request.get('/api/learn');
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty('success', true);
    expect(body).toHaveProperty('report');
  });

  test('POST /api/learn → özel windowHours ile çalışır', async ({ request }) => {
    const res = await request.post('/api/learn', {
      data: { windowHours: 1 },
    });
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty('success', true);
  });
});

test.describe('API — Notify (Telegram)', () => {
  test('GET /api/notify → durum kontrol', async ({ request }) => {
    const res = await request.get('/api/notify');
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty('success', true);
    expect(body).toHaveProperty('available');
  });

  test('POST /api/notify → message zorunlu, boş body → 400', async ({ request }) => {
    const res = await request.post('/api/notify', {
      data: {},
    });
    expect(res.status()).toBe(400);

    const body = await res.json();
    expect(body).toHaveProperty('success', false);
  });
});

test.describe('API — Board (Konsensüs)', () => {
  test('GET /api/board/decide → karar listesi', async ({ request }) => {
    const res = await request.get('/api/board/decide');
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty('success', true);
    expect(body).toHaveProperty('decisions');
    expect(body).toHaveProperty('count');
    expect(Array.isArray(body.decisions)).toBe(true);
  });

  test('POST /api/board/decide → boş body → 400 validasyon hatası', async ({ request }) => {
    const res = await request.post('/api/board/decide', {
      data: {},
    });
    expect(res.status()).toBe(400);

    const body = await res.json();
    expect(body).toHaveProperty('success', false);
  });
});

test.describe('API — Telegram Webhook', () => {
  test('GET /api/telegram → webhook durum', async ({ request }) => {
    const res = await request.get('/api/telegram');
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty('service');
    expect(body).toHaveProperty('status');
    expect(body).toHaveProperty('version');
  });
});
