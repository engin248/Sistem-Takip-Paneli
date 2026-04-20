import os

replacements = {
    # Extreme deep corruptions
    'Ã„Â°': 'İ',
    'Ã„Â±': 'ı',
    'ÃƒÂ¼': 'ü',
    'Ã„Å¸': 'ğ',
    'Ã„Å¾': 'Ğ',
    'ÃƒÂ¶': 'ö',
    'ÃƒÂ–': 'Ö',
    'ÃƒÂ§': 'ç',
    'ÃƒÂ‡': 'Ç',
    'Ã…Å¸': 'ş',
    'Ã…Å¾': 'Ş',
    'Ãƒâ€': 'Ö',
    
    # Mid-level corruptions
    'Ã¢â€¢Â': '═',
    'Ã¢Â€Â”': '—',
    
    # Shallow corruptions (these usually result from decoding Latin1 as UTF-8)
    'Ä°': 'İ',
    'Ä±': 'ı',
    'Äž': 'Ğ',
    'ÄŸ': 'ğ',
    'Ã–': 'Ö',
    'Ã¶': 'ö',
    'Ãœ': 'Ü',
    'Ã¼': 'ü',
    'Ã‡': 'Ç',
    'Ã§': 'ç',
    'Åž': 'Ş',
    'ÅŸ': 'ş',
    
    # Specific words from screenshot
    'DENETÃ–Ã\x84Â°': 'DENETÇİ',
    'DENETÃ–\x84Â°': 'DENETÇİ',
    'DOÃ\x84Â\x96RULA': 'DOĞRULA',
    'DOÃ„Â\x96RULA': 'DOĞRULA',
    'DOÃ\x84\x82Â\x96RULA': 'DOĞRULA',
    'DOÃ\x84Â‖RULA': 'DOĞRULA', # Custom from log
    'DENETÖĮİ': 'DENETÇİ',     # As seen in the prompt
    'DOĞ,Â‖RULA': 'DOĞRULA',
    'DOĞ,,Â‖RULA': 'DOĞRULA',
    'saldı,ırA,,ı': 'saldırıları',
    'kullanı,ılabilir': 'kullanılabilir',
    'tutarlı,ılA,,ık': 'tutarlılık',
    'erişebilirlik': 'erişilebilirlik',
    'eriilebilirlik': 'erişilebilirlik',
    
    # specific characters showing up in OCR / prompt
    'ÖĮİ': 'Çİ',
    'Ã„Â‖': 'Ğ',
    'Ã„Â': 'Ğ',
    
    # other garbled specific to Agent names
    'â€“': '—',
    'Ã¢â‚¬â€œ': '—',
    'â€”': '—',
    'Ã¢â‚¬â€': '—',
    
    'AÃ§Ä±klama': 'Açıklama',
    'YAPAY ZEKA KURMAYINI Ã‡ALIÅžTIR': 'YAPAY ZEKA KURMAYINI ÇALIŞTIR',
    
    # Clean up any leftover strange artifacts if we know they map to specific Turkish chars
    'TuÃ„ÂŸgeneral': 'Tuğgeneral',
}

def clean_deep_corruption(text):
    import re
    # We will do an aggressive regex replacement for specific corruptions that vary slightly
    
    # Case: DENETÖĮİ -> DENETÇİ
    text = re.sub(r'DENETÖĮİ', 'DENETÇİ', text)
    # Case: DOÃ„Â‖RULA -> DOĞRULA  (can be many weird chars after DO)
    text = re.sub(r'DO[ÃÄÅÖ].{1,4}RULA', 'DOĞRULA', text)
    # Case: saldı,ırA,,ı -> saldırıları
    text = re.sub(r'saldı[^\w\s]{1,4}ırA[^\w\s]{1,4}ı', 'saldırıları', text)
    # Case: tutarlı,ılA,,ık -> tutarlılık
    text = re.sub(r'tutarlı[^\w\s]{1,4}ılA[^\w\s]{1,4}ık', 'tutarlılık', text)
    # Case: kullanı,ılabilir -> kullanılabilirlik / kullanılabilir
    text = re.sub(r'kullanı[^\w\s]{1,4}ılabilir', 'kullanılabilir', text)
    # Case: System Denetçisi 1 â€“ Sadece -> System Denetçisi 1 — Sadece
    text = re.sub(r'1 â€“ Sadece', '1 — Sadece', text)
    text = re.sub(r'2 â€“ Sadece', '2 — Sadece', text)
    text = re.sub(r'3 â€“ Sadece', '3 — Sadece', text)
    text = re.sub(r'4 â€“ Sadece', '4 — Sadece', text)
    
    # Catch any leftover â€“
    text = text.replace('â€“', '—')
    text = text.replace('â€”', '—')
    text = text.replace('├', '')
    
    for broken, fixed in replacements.items():
        text = text.replace(broken, fixed)
        
    return text

fixed_count = 0
for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith(('.ts', '.tsx', '.json')):
            filepath = os.path.join(root, file)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                new_content = clean_deep_corruption(content)
                
                if content != new_content:
                    with open(filepath, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    print(f"Fixed: {filepath}")
                    fixed_count += 1
            except Exception as e:
                pass
                
print(f"Total files fixed: {fixed_count}")
