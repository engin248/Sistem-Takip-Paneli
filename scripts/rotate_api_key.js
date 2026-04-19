const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function genKey() { return crypto.randomBytes(16).toString('hex'); }

function rotate(newKey) {
  const envPath = path.resolve(__dirname, '..', '.env');
  let content = '';
  if (fs.existsSync(envPath)) content = fs.readFileSync(envPath, 'utf8');
  const lines = content.split(/\r?\n/).filter(Boolean);
  let found = false;
  const out = lines.map(line => {
    if (line.startsWith('NIZAM_API_KEY=')) { found = true; return `NIZAM_API_KEY=${newKey}`; }
    return line;
  });
  if (!found) out.push(`NIZAM_API_KEY=${newKey}`);
  fs.writeFileSync(envPath, out.join('\n') + '\n', 'utf8');
  console.log('Rotated key to:', newKey);
}

if (require.main === module) {
  const nk = genKey();
  rotate(nk);
}

module.exports = { rotate };
