const http = require('http');
function check(apiKey, cb) {
  const opts = { hostname: 'localhost', port: 4000, path: '/api/validate-key', method: 'GET', headers: { 'x-api-key': apiKey } };
  const req = http.request(opts, res => {
    let b=''; res.on('data', c=>b+=c); res.on('end', ()=>cb(null, res.statusCode, b));
  });
  req.on('error', cb); req.end();
}
if (require.main === module) {
  const apiKey = process.env.NIZAM_API_KEY || 'Kendi_Gizli_Anahtariniz';
  check(apiKey, (err, status, body) => {
    if (err) return console.error('Err', err && err.stack || err);
    console.log('Status', status, 'Body', body);
  });
}

module.exports = { check };
