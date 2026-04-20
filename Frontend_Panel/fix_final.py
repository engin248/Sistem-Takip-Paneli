import os, re

def fix(text):
    text = re.sub(r'DENET[^\s\-A-Z0-9]+-KOD', 'DENETÇİ-KOD', text)
    text = re.sub(r'DENET[^\s\-A-Z0-9]+-DO.*RULA', 'DENETÇİ-DOĞRULA', text) 
    text = re.sub(r'DENET[^\s\-A-Z0-9]+-G.*VENL.K', 'DENETÇİ-GÜVENLİK', text)
    text = re.sub(r'DENET[^\s\-A-Z0-9]+-PERF', 'DENETÇİ-PERFORMANS', text)
    text = re.sub(r'DENET[^\s\-A-Z0-9]+-VER.', 'DENETÇİ-VERİ', text)
    text = re.sub(r'DENET[^\s\-A-Z0-9]+-UX', 'DENETÇİ-UX', text)
    
    text = re.sub(r'Sistem Denet[^\sA-Z0-9]+ (\d+) .*?Sadece', r'Sistem Denetçisi \1 — Sadece', text)
    
    text = re.sub(r'DO[^\sA-Z]+RULA', 'DOĞRULA', text)
    text = re.sub(r'G[^\sA-Za-z]+VENL.K', 'GÜVENLİK', text)
    
    text = re.sub(r'kullan[^\sA-Z]+labilirlik', 'kullanılabilirlik', text)
    text = re.sub(r'eri[^\sA-Z]+lebilirlik', 'erişilebilirlik', text)
    text = re.sub(r'sald[^\sA-Z]+lar[^\sA-Z]*', 'saldırıları', text)
    text = re.sub(r'tutarl[^\sA-Z]+k', 'tutarlılık', text)
    
    return text

fixed = 0
for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith(('.ts', '.tsx')):
            p = os.path.join(root, file)
            with open(p, 'r', encoding='utf-8') as f:
                content = f.read()
            new_content = fix(content)
            if new_content != content:
                with open(p, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f'Cleaned final deep corruption: {p}')
                fixed += 1
