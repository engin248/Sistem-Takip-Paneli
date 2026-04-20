import os

filepath = 'src/services/agentRegistry.ts'
with open(filepath, 'r', encoding='utf-8') as f:
    text = f.read()

reps = {
    'Ã¢â€\x80â€™': '→',
    'Ã¢â€\x80\x99': '→',
    'Ã„ı': 'ı',
    'Ã…Âž': 'Ş',
    'Ã¢â€¢Â': '═',
    'Ã¢â‚¬â€œ': '—',
    
    # Specific words
    'İCRAATÖ¡I': 'İCRAATÇI',
    'DENETÖ¡İ': 'DENETÇİ',
    'Ö¡elişki': 'Çelişki',
    'Ö¡özümü': 'Çözüm',
    'saldÃ„ırÃ„ı': 'saldırı',
    'saldÃ„ırÃ„ı': 'saldırı',
    'araştÃ„ırma': 'araştırma',
    'dağÃ„ılÃ„ımÃ„ı': 'dağılımı',
    'DÃ„ış': 'Dış',
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
    'gerçek zamanlÃ„ı': 'gerçek zamanlı',
    'yapamayacağÃ„ı': 'yapamayacağı',
    'sayÃ„ısÃ„ı': 'sayısı',
    'zamanÃ„ı': 'zamanı',
    'kaynağÃ„ı': 'kaynağı',
    'klonlanmÃ„ışsa': 'klonlanmışsa',
    'iş mantÃ„ığÃ„ı': 'iş mantığı',
    'VeritabanÃ„ı': 'Veritabanı',
    'sÃ„ızÃ„ıntÃ„ısÃ„ı': 'sızıntısı',
    'kanÃ„ıt': 'kanıt',
    'KanÃ„ıt': 'Kanıt',
    'AltyapÃ„ı': 'Altyapı',
    'ayÃ„ıklama': 'ayıklama',
    'çatÃ„ışma': 'çatışma',
    'KÖ“PRÜ': 'KÖPRÜ',
    'Ö“NBELLEK': 'ÖNBELLEK',
    'Ö“LÖ¡ER': 'ÖLÇER',
    'Ö“ĞžRETMEN': 'ÖĞRETMEN',
    'HafÃ„ıza': 'Hafıza',
    'hafÃ„ızasÃ„ı': 'hafızası',
    'yapabildiği': 'yapabildiği',
    'ıı': 'ı',     # Cleanup any double merges
    'Ã¢â€': '—'
}

for k, v in reps.items():
    text = text.replace(k, v)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(text)

print('Agent registry cleaned.')
