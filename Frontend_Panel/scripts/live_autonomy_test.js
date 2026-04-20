#!/usr/bin/env node
'use strict';

const http = require('http');

const PORT = Number(process.env.AUTONOMY_PORT || 4010);
const HOST = '127.0.0.1';

function request(method, route, data) {
  return new Promise((resolve, reject) => {
    const payload = data ? JSON.stringify(data) : null;
    const req = http.request({
      hostname: HOST,
      port: PORT,
      path: route,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': payload ? Buffer.byteLength(payload) : 0,
      },
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk.toString('utf8');
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(body || '{}'));
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

function expect(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

(async () => {
  const initialStatus = await request('GET', '/status');
  console.log('[LIVE_TEST] initial status:', JSON.stringify(initialStatus, null, 2));

  const successCase = await request('POST', '/task', {
    type: 'api',
    topic: 'approve-mapping',
    goal: 'Onay endpointini güvenli ve hızlı çalıştır',
    project: 'stp',
  });
  console.log('[LIVE_TEST] success case:', JSON.stringify(successCase, null, 2));
  expect(successCase.success === true, 'API görev akışı başarılı olmalı.');
  expect(successCase.logs.includes('[MEMORY] saved'), 'Başarılı görev memory kaydı üretmeli.');

  const unknownCase = await request('POST', '/task', {
    type: 'unknown',
    topic: 'bilinmeyen-akis',
    goal: 'Tanımsız görev',
  });
  console.log('[LIVE_TEST] unknown case:', JSON.stringify(unknownCase, null, 2));
  expect(unknownCase.logs.includes('[RULE] FAIL'), 'Unknown görev rule fail üretmeli.');

  const anomalyCase = await request('POST', '/task', {
    type: 'unknown',
    topic: 'bilinmeyen-akis',
    goal: 'Tanımsız görev',
  });
  console.log('[LIVE_TEST] anomaly case:', JSON.stringify(anomalyCase, null, 2));
  expect(anomalyCase.logs.includes('[ANOMALY] RED'), 'Tekrarlı unknown görev anomaly red üretmeli.');

  const duplicateCase = await request('POST', '/task', {
    type: 'api',
    topic: 'approve-mapping',
    goal: 'Onay endpointini güvenli ve hızlı çalıştır',
    project: 'stp',
  });
  console.log('[LIVE_TEST] duplicate case:', JSON.stringify(duplicateCase, null, 2));
  expect(duplicateCase.logs.includes('[DUPLICATE] REJECT'), 'Tekrarlı başarılı görev duplicate reject üretmeli.');

  const healingCase = await request('POST', '/task', {
    type: 'api',
    topic: 'retryable-health-check',
    goal: 'İlk denemede fail sonra iyileş',
    project: 'stp',
    simulate: 'fail-once',
  });
  console.log('[LIVE_TEST] healing case:', JSON.stringify(healingCase, null, 2));
  expect(healingCase.success === true, 'Healing senaryosu sonunda başarılı olmalı.');
  expect(healingCase.healing === undefined || healingCase.logs.includes('[HEALING] attempt 1'), 'Healing logu görünmeli.');

  const finalStatus = await request('GET', '/status');
  console.log('[LIVE_TEST] final status:', JSON.stringify(finalStatus, null, 2));
  expect(finalStatus.agents.total >= initialStatus.agents.total, 'Evrim sonrası ajan sayısı aynı veya fazla olmalı.');

  console.log('[LIVE_TEST] PASS');
})().catch((error) => {
  console.error('[LIVE_TEST] FAIL:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
