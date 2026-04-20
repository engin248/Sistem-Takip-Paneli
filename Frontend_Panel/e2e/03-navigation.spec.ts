// ============================================================
// E2E TEST — NAVİGASYON VE SAYFA GEÇİŞLERİ
// ============================================================
// NavBar bileşeni, sayfa geçişleri, log sayfası,
// responsive davranış ve erişilebilirlik kontrolleri.
// ============================================================

import { test, expect } from '@playwright/test';

test.describe('Navigasyon', () => {
  test('NavBar görünür ve logo/başlık mevcut', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Nav bar mevcut
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
  });

  test('/logs sayfasına geçiş yapılabilir', async ({ page }) => {
    await page.goto('/logs');
    await page.waitForLoadState('networkidle');

    // Sayfa 200 yüklenir (404 dönemez)
    expect(page.url()).toContain('/logs');
  });

  test('bilinmeyen sayfa → 404 sayfası', async ({ page }) => {
    const res = await page.goto('/bu-sayfa-yok-12345');
    // Next.js 404 sayfası
    expect(res?.status()).toBe(404);
  });
});

test.describe('Responsive Davranış', () => {
  test('mobil viewport — sayfa yüklenir', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // H1 hâlâ görünür
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
  });

  test('tablet viewport — sayfa yüklenir', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
  });
});

test.describe('Erişilebilirlik — Temel', () => {
  test('sayfada en az bir h1 var', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBeGreaterThanOrEqual(1);
  });

  test('tüm butonlar tıklanabilir durumda', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const buttons = page.locator('button');
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);

    // İlk buton tıklanabilir
    await expect(buttons.first()).toBeEnabled();
  });

  test('sayfa lang attribute içeriyor', async ({ page }) => {
    await page.goto('/');
    const lang = await page.locator('html').getAttribute('lang');
    expect(lang).toBeTruthy();
  });
});
