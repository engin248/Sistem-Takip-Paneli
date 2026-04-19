const http = require('http');

function postApprove(canonical, alias, apiKey, cb) {
  const data = JSON.stringify({ canonical, alias });
  const timestamp = Math.floor(Date.now()/1000);
  const crypto = require('crypto');
  const secret = apiKey;
  const sig = crypto.createHmac('sha256', secret).update(String(timestamp) + '.' + data).digest('hex');
  const opts = {
    hostname: 'localhost',
    port: 4000,
    path: '/api/approve-mapping',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
      'x-api-key': apiKey,
      'x-signature': sig,
      'x-timestamp': String(timestamp)
    }
  };
  const req = http.request(opts, res => {
    let body = '';
    res.on('data', c => body += c);
    res.on('end', () => cb(null, res.statusCode, body));
  });
  req.on('error', cb);
  req.write(data);
  req.end();
}

if (require.main === module) {
  const apiKey = process.env.NIZAM_API_KEY || 'Kendi_Gizli_Anahtariniz';
  postApprove('Fiyat', 'PanelApprovedAlias', apiKey, (err, status, body) => {
    if (err) return console.error('Request error', err.message);
    console.log('Status:', status);
    console.log('Body:', body);
  });
}

module.exports = { postApprove };
