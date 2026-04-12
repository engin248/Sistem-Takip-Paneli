#!/usr/bin/env node
// ============================================================
// KORUMA SCRIPTİ: middleware.ts YASAKLAYICI
// ============================================================
// Next.js 16+ proxy.ts VE middleware.ts birlikte YASAKLADI.
// Bu script build öncesi çalışarak middleware.ts varlığını kontrol eder.
// Eğer bulursa build'i DURDURUR.
//
// Kullanım: package.json → "prebuild": "node scripts/check-no-middleware.mjs"
// ============================================================

import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

const FORBIDDEN_FILES = [
  'src/middleware.ts',
  'src/middleware.js',
  'middleware.ts',
  'middleware.js',
];

let hasViolation = false;

for (const file of FORBIDDEN_FILES) {
  const fullPath = resolve(projectRoot, file);
  if (existsSync(fullPath)) {
    console.error(`\n🔴 [ERR-STP001-PROXY-GUARD] YASAK DOSYA TESPİT EDİLDİ!`);
    console.error(`   Dosya: ${fullPath}`);
    console.error(`   Neden: Next.js 16+ middleware.ts + proxy.ts birlikte YASAKLADI.`);
    console.error(`   Çözüm: middleware.ts SİLİN. Tüm mantık proxy.ts'e taşınmalıdır.`);
    console.error(`   Bkz: https://nextjs.org/docs/messages/middleware-to-proxy\n`);
    hasViolation = true;
  }
}

if (hasViolation) {
  process.exit(1);
} else {
  console.log('✅ [PROXY-GUARD] middleware.ts yok — proxy.ts tek başına çalışıyor.');
}
