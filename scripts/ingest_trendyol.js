const fs = require('fs');
const path = require('path');
const trendyolAdapter = require('../core/adapters/trendyol');
const { parseReport, toCSV } = require('../core/report_parser');
const SmartAdapterEngine = require('../core/smart_adapter_engine');
const { hat3 } = require('../core/hat1_connection');

// Example Trendyol-like payload
const sample = [
  {
    orderId: 'T-100',
    timestamp: '2026-04-19T12:00:00Z',
    completedCount: 5,
    pendingCount: 2,
    activities: [ { type: 'ok', msg: 'ok' }, { type: 'ok', msg: 'ok' }, { type: 'warn', msg: 'del' } ],
    seller: 'seller-A',
    Maliyet: '123.45 TL',
    fabric: 'Saten'
  },
  {
    orderId: 'T-101',
    timestamp: '2026-04-19T12:05:00Z',
    completedCount: 3,
    pendingCount: 1,
    activities: [],
    seller: 'seller-B',
    price: '89.90 TL',
    fabric: 'Pamuk'
  }
];

async function run() {
  // use original sample records as sampleRecord for SmartAdapterEngine
  for (const item of sample) {
    const mission = {
      missionId: `mission-${item.orderId}`,
      targetUrl: `trendyol://${item.orderId}`,
      targetFields: ['Fiyat', 'Kumaş Bilgisi'],
      sampleRecord: item,
      silent: true
    };
    await SmartAdapterEngine.readTarget(mission);
  }

  // After missions, read hat3 data and print only requested fields, clean
  for (const entry of hat3.data) {
    try {
      const payload = JSON.parse(entry.val);
      const data = payload.data || {};
      const fmt = (field) => {
        const cell = data[field] || data[field.toLowerCase()] || data[field.replace(/\s+/g, '').toLowerCase()];
        if (!cell) return '';
        if (typeof cell === 'object') {
          const v = cell.value == null ? '' : cell.value;
          const conf = typeof cell.confidence === 'number' ? ` ${Math.round(cell.confidence*100)}%` : '';
          const review = cell.review ? ' [ONAY_BEKLIYOR]' : '';
          return `${v}${conf}${review}`;
        }
        return String(cell);
      };
      const fiyat = fmt('Fiyat');
      const kumas = fmt('Kumaş Bilgisi');
      console.log(`${fiyat}\t${kumas}`);
    } catch (e) {
      // ignore
    }
  }
}

if (require.main === module) run();

module.exports = { run };
