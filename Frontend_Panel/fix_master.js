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
  'EŞ': 'Eş',
  'ÇALIÅžMA': 'ÇALIŞMA',
  'ÇALIÅ|MA': 'ÇALIŞMA',
  'İCRAATÖ¡I': 'İCRAATÇI',
  'DENETÖ¡İ': 'DENETÇİ',
  'Ö¡elişki': 'Çelişki',
  'Ö¡özümü': 'Çözüm',
  'saldÃ„ırÃ„ı': 'saldırı',
  'araştÃ„ırma': 'araştırma',
  'dağÃ„ılÃ„ımÃ„ı': 'dağılımı',
  'bağÃ„ımlÃ„ılÃ„ık': 'bağımlılık',
  'tasarÃ„ımÃ„ı': 'tasarımı',
  'ağaçÃ„ı': 'ağacı',
  'tasarÃ„ım': 'tasarım',
  'ZamanlayÃ„ıcÃ„ı': 'Zamanlayıcı',
  'çakÃ„ışmasÃ„ı': 'çakışması',
  'anlaşmazlÃ„ık': 'anlaşmazlık',
  'Ö“NBELLEK': 'ÖNBELLEK',
  'OPTİMİZÖ“R': 'OPTİMİZÖR',
  'KORDİNATÖ“R': 'KOORDİNATÖR',
  'FORMATÖ“R': 'FORMATÖR',
  'Ö“LÖ¡ER': 'ÖLÇER',
  'Ö“ĞžRETMEN': 'ÖĞRETMEN',
  'TETİKÖ¡İ': 'TETİKÇİ',
  'Ö¡EVİRMEN': 'ÇEVİRMEN',
  'YEDEKÖ¡I': 'YEDEKÇİ',
  'KÖ“PRÜ': 'KÖPRÜ',
  'NÖ“BETÖ¡İ': 'NÖBETÇİ',
  'açÃ„ıklamasÃ„ı': 'açıklaması',
  'kaydÃ„ı': 'kaydı',
  'hatasÃ„ı': 'hatası',
  'ZamanlÃ„ı': 'Zamanlı',
  'yapamayacağÃ„ı': 'yapamayacağı',
  'sayÃ„ısÃ„ı': 'sayısı',
  'zamanÃ„ı': 'zamanı',
  'kaynağÃ„ı': 'kaynağı',
  'klonlanmÃ„ışsa': 'klonlanmışsa',
  'VeritabanÃ„ı': 'Veritabanı',
  'sÃ„ızÃ„ıntÃ„ısÃ„ı': 'sızıntısı',
  'kanÃ„ıt': 'kanıt',
  'ayÃ„ıklama': 'ayıklama',
  'çatÃ„ışma': 'çatışma',
  'HafÃ„ıza': 'Hafıza',
  'hafÃ„ızasÃ„ı': 'hafızası',
  'yapabildiği': 'yapabildiği'
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
      console.log('Fixed:', filePath);
    }
  }
});
