import os

replacements = {
    'Ã¢â€¢Â': '═',    # Borders
    'Ã„Â°': 'İ',     # İ
    'ÃƒÂ¼': 'ü',     # ü
    'Ã„Å¸': 'ğ',     # ğ
    'Ã„Â±': 'ı',     # ı
    'ÃƒÂ–': 'Ö',     # Ö
    'ÃƒÂ§': 'ç',     # ç
    'Ã…Å¸': 'ş',     # ş
    'Ã„Å¾': 'Ğ',     # Ğ
    'Ãƒâ€': 'Ö',     # Ö (some variants)
    'ÃƒÂ¶': 'ö',     # ö
    'ÃƒÂ‡': 'Ç',     # Ç
    'Ã…Å¾': 'Ş',     # Ş
    'ÃƒÅ“': 'Ü',     # Ü
    'Ã¢â‚¬â€': '—',  # em dash
    'Ã¢Â€Â”': '—',   # em dash
    'komutanÃ„Â±': 'komutanı',
    'AÃ§Ä±klama': 'Açıklama',
    'YAPAY ZEKA KURMAYINI Ã‡ALIÅžTIR': 'YAPAY ZEKA KURMAYINI ÇALIŞTIR'
}

def fix_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except:
        return False
        
    new_content = content
    for broken, fixed in replacements.items():
        new_content = new_content.replace(broken, fixed)
        
    if content != new_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        return True
    return False

fixed_count = 0
for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith(('.ts', '.tsx')):
            filepath = os.path.join(root, file)
            if fix_file(filepath):
                print(f"Fixed deeper encoding in: {filepath}")
                fixed_count += 1
                
print(f"Total fixed: {fixed_count}")
