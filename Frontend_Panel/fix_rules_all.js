const fs = require('fs');
const path = require('path');

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
  'OŞ': 'Oş',
  'öŞ': 'öş',
  'EŞ': 'Eş',
  'ÇALIÅžMA': 'ÇALIŞMA',
  'ÇALIÅ|MA': 'ÇALIŞMA',
  'DeğiŞtirilemez': 'Değiştirilemez',
  'ıŞ': 'ış',
  'şlı': 'şlı',
  'â• ': '═',
  'â”€': '─',
  'â†’': '→',
  'â†—': '↳',
  'ğŸš«': '🚫',
  'â ¸': '⏳',
  'âš ': '⚠️',
  'BAÄžLAYICI': 'BAĞLAYICI',
  'ÖNCELİÄžİ': 'ÖNCELİĞİ',
  'ZORUNLULUÄžU': 'ZORUNLULUĞU',
  'ODAÄžI': 'ODAĞI',
};

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    if (fs.statSync(dirPath).isDirectory()) {
      if (!dirPath.includes('node_modules') && !dirPath.includes('.next')) {
        walkDir(dirPath, callback);
      }
    } else {
      callback(dirPath);
    }
  });
}

const entries = Object.entries(reps);
walkDir('./src', (filePath) => {
  if (filePath.endsWith('.ts') || filePath.endsWith('.tsx') || filePath.endsWith('.json')) {
    let text = fs.readFileSync(filePath, 'utf8');
    let orig = text;
    for (const [k, v] of entries) {
      text = text.split(k).join(v);
    }
    if (text !== orig) {
      fs.writeFileSync(filePath, text, 'utf8');
      console.log('Fixed universally:', filePath);
    }
  }
});
