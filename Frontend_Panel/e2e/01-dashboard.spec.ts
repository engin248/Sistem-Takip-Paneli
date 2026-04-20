// ============================================================
// E2E TEST — DASHBOARD ANA SAYFA
// ============================================================
// Sayfa yüklenmesi, temel UI bileşenleri, kilit mekanizması
// ve navigasyon kontrolü.
// ============================================================

import { test, expect } from '@playwright/test';

test.describe('Dashboard — Ana Sayfa', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('sayfa başarıyla yüklenir ve başlık görünür', async ({ page }) => {
    // Title kontrolü
    await expect(page).toHaveTitle(/Sistem Takip Paneli|STP/i);

    // Dashboard başlığı görünür
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
  });

  test('sistem durumu badge görünür', async ({ page }) => {
    // "SİSTEM ÇEVRİMİÇİ" veya Arapça "النظام متصل" badge'i
    const statusBadge = page.locator('text=/SİSTEM ÇEVRİMİÇİ|النظام متصل/i');
    await expect(statusBadge).toBeVisible();
  });

  test('kilit mekanizması çalışıyor — varsayılan kilitli', async ({ page }) => {
    // Sayfa açıldığında kilit simgesi görünür
    const lockIcon = page.locator('text=🔒');
    await expect(lockIcon).toBeVisible();

    // Kilit açma butonu var
    const lockButton = page.locator('button', { hasText: /ERİŞİM KİLİTLİ|Access Locked|KİLİTLİ/i });
    await expect(lockButton).toBeVisible();
  });

  test('kilit açıldığında görev formu görünür', async ({ page }) => {
    // Kilidi aç
    const lockButton = page.locator('button', { hasText: /ERİŞİM KİLİTLİ|Access Locked|KİLİTLİ/i });
    await lockButton.click();

    // Görev formu görünür olmalı — h2 başlığı
    const taskSection = page.getByRole('heading', { name: /Yeni Emir Girişi|إدخال أمر جديد/i });
    await expect(taskSection).toBeVisible({ timeout: 5000 });
  });

  test('kilidi aç → Kanban panosu görünür', async ({ page }) => {
    // Kilidi aç
    const lockButton = page.locator('button', { hasText: /ERİŞİM KİLİTLİ|Access Locked|KİLİTLİ/i });
    await lockButton.click();

    // Kanban kolonu görünür (beklemede, devam ediyor, tamamlandı)
    await expect(page.locator('text=/beklemede|pending|devam/i').first()).toBeVisible({ timeout: 5000 });
  });

  test('Audit Log footer alanı sayfada mevcut', async ({ page }) => {
    // Footer (audit log) sticky alanı
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
  });

  test('Stats bileşeni görev sayılarını gösteriyor', async ({ page }) => {
    // Stats bileşeni her zaman görünür (kilitli olsa da)
    const statsSection = page.locator('[class*="grid"]').first();
    await expect(statsSection).toBeVisible();
  });
});
