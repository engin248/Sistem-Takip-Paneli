const assert = require('assert');
const { parseReport, toCSV } = require('./report_parser');

const sample = [
  {
    id: 'r1',
    meta: { source: 'hat3', ts: '2026-04-19T10:00:00Z' },
    metrics: { completed: 5, pending: 2 },
    events: [ { type: 'ok', msg: 'done' }, { type: 'warn', msg: 'delay' } ]
  },
  {
    id: 'r2',
    meta: { source: 'hat3', ts: '2026-04-19T10:05:00Z' },
    metrics: { completed: 3, pending: 1 },
    events: []
  }
];

const out = parseReport(sample);

// Basic structural assertions
assert.ok(Array.isArray(out.columns), 'columns must be array');
assert.ok(Array.isArray(out.rows), 'rows must be array');
assert.strictEqual(out.rows.length, 2, 'should parse two records');

// Check presence of expected flattened keys and aliases/computed columns
assert.ok(out.columns.includes('id'));
assert.ok(out.columns.includes('meta.source'));
assert.ok(out.columns.includes('metrics.completed'));
assert.ok(out.columns.includes('events'));
assert.ok(out.columns.includes('Zaman Damgası'), 'alias for meta.ts should exist');
assert.ok(out.columns.includes('events.success_rate'), 'computed success rate should exist');

// Find indexes for checks
const idx = (name) => out.columns.indexOf(name);
const rowFor = (id) => out.rows.find(r => r[idx('id')] === id);

const r1 = rowFor('r1');
assert.strictEqual(r1[idx('metrics.completed')], 5);
assert.strictEqual(r1[idx('events.success_rate')], 0.5);
const r2 = rowFor('r2');
assert.strictEqual(r2[idx('metrics.pending')], 1);
assert.strictEqual(r2[idx('events.success_rate')], null);

// CSV export check
const csv = toCSV(out, ',');
const lines = csv.split('\n');
assert.strictEqual(lines.length, 3, 'CSV should have header + 2 rows');
assert.ok(lines[0].includes('Zaman Damgası'));

console.log('TEST PASSED: core/report_parser');
