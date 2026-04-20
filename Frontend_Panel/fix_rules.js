const fs = require('fs');

let text = fs.readFileSync('src/core/agentRules.ts', 'utf8');

const reps = {
  'GÖREV BÜTÜNLÜÄžÜ': 'GÖREV BÜTÜNLÜĞÜ',
  'SIRASIYLA İÅžLEM': 'SIRASIYLA İŞLEM',
  'TAMAMLANMAMIÅž': 'TAMAMLANMAMIŞ',
  'DEVRE DIÅžI': 'DEVRE DIŞI',
  'İÅž': 'İŞ',
  'değiŞ': 'değiş',
  'baŞla': 'başla',
  'karŞı': 'karşı',
  'anlaŞ': 'anlaş',
  'koŞul': 'koşul',
  'çalıŞ': 'çalış',
  'teŞh': 'teşh',
  'iŞle': 'işle',
  'iŞi': 'işi',
  'iŞ ': 'iş ',
  'iŞ\n': 'iş\n',
  'iŞ.': 'iş.',
  'iŞ,': 'iş,',
  'eŞ': 'eş',
  'aŞ': 'aş',
  'AŞ': 'Aş',
  'EŞ': 'Eş',
  'ÇALIÅžMA': 'ÇALIŞMA',
  'ÇALIÅ|MA': 'ÇALIŞMA',
  'DeğiŞtirilemez': 'Değiştirilemez',
  'ıŞ': 'ış',
  'şlı': 'şlı',
  'â• ': '═',
  'â”€': '─',
  'â†’': '→',
  'ğŸš«': '🚫',
  'â ¸': '⏳',
  'âš ': '⚠️',
  'BAÄžLAYICI': 'BAĞLAYICI',
  'ÖNCELİÄžİ': 'ÖNCELİĞİ',
  'ZORUNLULUÄžU': 'ZORUNLULUĞU',
  'ODAÄžI': 'ODAĞI',
};

const entries = Object.entries(reps);
let orig = text;
for (const [k, v] of entries) {
  text = text.split(k).join(v);
}
if (text !== orig) {
  fs.writeFileSync('src/core/agentRules.ts', text, 'utf8');
  console.log('Fixed: src/core/agentRules.ts');
}
