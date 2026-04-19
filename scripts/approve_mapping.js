const { addSynonym } = require('../core/adapter_utils');

// Usage: node scripts/approve_mapping.js "Fiyat" "Maliyet"
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: node scripts/approve_mapping.js <Canonical> <Alias>');
  process.exit(1);
}
const [canonical, alias] = args;
addSynonym(canonical, alias);
console.log(`Approved mapping: ${alias} -> ${canonical}`);
