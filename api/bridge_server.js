const http = require('http');
const fs = require('fs');
const path = require('path');
const { addSynonym } = require('../core/adapter_utils');
const { hat2 } = require('../core/hat1_connection');
const crypto = require('crypto');

const PORT = process.env.PORT || 4000;

// Load .env if NIZAM_API_KEY not present
function loadEnv() {
  const envPath = path.resolve(__dirname, '..', '.env');
  try {
    if (fs.existsSync(envPath)) {
      const raw = fs.readFileSync(envPath, 'utf8');
      for (const line of raw.split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
        if (m) {
          const k = m[1];
          let v = m[2];
          // strip possible quotes
          if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
          // always overwrite with values from .env so rotation takes effect without restart
          process.env[k] = v;
        }
      }
    }
  } catch (e) { }
}


function unauthorized(res, ip) {
  // Log failed attempt to hat2 without leaking keys
  try {
    hat2.lpush('LOG_LINE', { info: `Hatalı Anahtar Denemesi: [${ip}]` });
  } catch (e) { }
  res.writeHead(401, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Unauthorized' }));
}
const server = http.createServer((req, res) => {
  // reload env per-request so rotation is effective without restarting
  loadEnv();
  // auth middleware
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
  const key = req.headers['x-api-key'] || req.headers['X-API-KEY'];
  if (!process.env.NIZAM_API_KEY) {
    // no key configured: reject
    unauthorized(res, ip);
    return;
  }
  if (!key || key !== process.env.NIZAM_API_KEY) {
    unauthorized(res, ip);
    return;
  }

  if (req.method === 'GET' && req.url === '/api/validate-key') {
    // simple validation endpoint
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'valid' }));
    return;
  }

  if (req.method === 'POST' && req.url === '/api/approve-mapping') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body || '{}');

        // ── ZIRH: delta alanı zorunlu — yapılandırılmamış veri reddedilir ──
        if (data.delta === undefined || data.delta === null) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            error: 'delta alanı zorunludur',
            code: 'MISSING_DELTA',
            timestamp: new Date().toISOString(),
          }));
          return;
        }

        const { canonical, alias } = data;
        if (!canonical || !alias) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'canonical and alias required' }));
          return;
        }
        addSynonym(canonical, alias);
        console.log('\x1b[32mHafıza Güncellendi\x1b[0m');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', delta: data.delta }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'not found' }));
});

server.listen(PORT, () => console.log(`Bridge server listening on http://localhost:${PORT}/api/approve-mapping`));

module.exports = server;
