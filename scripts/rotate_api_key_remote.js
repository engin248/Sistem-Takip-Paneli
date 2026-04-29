const http = require('http');
const crypto = require('crypto');

function rotateRemote(apiKey, cb) {
  const data = JSON.stringify({ reason: 'rotate' });
  const ts = Math.floor(Date.now()/1000);
  const sig = crypto.createHmac('sha256', apiKey).update(String(ts) + '.' + data).digest('hex');
  const opts = {
    hostname: 'localhost', port: 4000, path: '/api/rotate-key', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), 'x-api-key': apiKey, 'x-signature': sig, 'x-timestamp': String(ts) }
  };
  const req = http.request(opts, res => {
    let body = '';
    res.on('data', c => body += c);
    res.on('end', () => cb(null, res.statusCode, body));
  });
  req.on('error', cb);
  req.write(data); req.end();
}

if (require.main === module) {
  const apiKey = process.env.NIZAM_API_KEY || 'Kendi_Gizli_Anahtariniz';
  rotateRemote(apiKey, (err, s, b) => {
    if (err) return console.error('rotate error', err.message || err);
    console.log('status', s, 'body', b);
  });
}

module.exports = { rotateRemote };
