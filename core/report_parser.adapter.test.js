const assert = require('assert');
const trendyolAdapter = require('./adapters/trendyol');
const { parseReport, toCSV } = require('./report_parser');

// Trendyol-like sample that uses different field names to test adapter
const sample = [
  {
    orderId: 'AT-1',
    timestamp: '2026-04-19T14:00:00Z',
    completedCount: 2,
    pendingCount: 1,
    activities: [ { type: 'ok' }, { type: 'fail' } ],
    seller: 'alpha'
  }
];

const out = parseReport(sample, { adapter: trendyolAdapter });

// structural
assert.ok(Array.isArray(out.columns));
assert.ok(Array.isArray(out.rows));
assert.strictEqual(out.rows.length, 1);

// check alias created by parseReport (meta.ts -> Zaman Damgası)
assert.ok(out.columns.includes('Zaman Damgası'));

// computed fields
const idx = name => out.columns.indexOf(name);
const row = out.rows[0];
assert.strictEqual(row[idx('metrics.total')], 3);
assert.strictEqual(row[idx('events.success_rate')], 0.5);

// CSV generation check
const csv = toCSV(out, ',');
assert.ok(csv.includes('Zaman Damgası'));

console.log('TEST PASSED: core/report_parser.adapter');
