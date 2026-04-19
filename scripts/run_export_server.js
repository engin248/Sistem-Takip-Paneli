const http = require('http');
const trendyolAdapter = require('../core/adapters/trendyol');
const { parseReport, toCSV } = require('../core/report_parser');

const PORT = process.env.PORT || 3000;

// Simple sample payload — in production this would come from live ingest
const sample = [
  { orderId: 'T-200', timestamp: '2026-04-19T13:00:00Z', completedCount: 4, pendingCount: 1, activities: [{type:'ok'}], seller: 'seller-X' }
];

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/export-csv') {
    const adapted = trendyolAdapter(sample);
    const table = parseReport(adapted);
    const csv = toCSV(table, ',');
    res.writeHead(200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="trendyol_export.csv"'
    });
    res.end(csv);
    return;
  }
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`CSV export server listening on http://localhost:${PORT}/export-csv`);
});

module.exports = server;
