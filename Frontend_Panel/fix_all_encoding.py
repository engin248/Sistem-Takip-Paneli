import os

# Karakter dÃ¼zeltme sÃ¶zlÃ¼ÄŸÃ¼ (Mapping of broken Turkish/UTF-8 encodings to correct characters)
replacements = {
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
    'Å\u0178': 'Ş', # ÅŸ is \u00c5\u0178 in some encodings
    'â—‚': '◀',
    'â–¸': '▶',
    'â–²': '▲',
    'â–¼': '▼',
    'Ã¢â‚¬â€œ': '—', # Dash
    'Ã¢â‚¬â€': '—',
    'TuÃ„\x81general': 'Tuğgeneral', # Deeply broken specific words
    'TuÃ„Â\x9fgeneral': 'Tuğgeneral',
    'TuÃ„\x81Â\x9fgeneral': 'Tuğgeneral',
    'komutanÃ„\x81Â±': 'komutanı',
    'komutanÃ„Â±': 'komutanı',
    'komutanÄ±': 'komutanı',
    'Tu\u00c3\u0178general': 'Tuğgeneral',
    'Tu\u00c3\u201e\u00c2\u0178general': 'Tuğgeneral',
    'komutan\u00c3\u201e\u00c2\u00b1': 'komutanı',
    'Ã¢Â€Â”': '—',
    'Â±': 'ı',
    'TuÃ„ÂŸgeneral': 'Tuğgeneral'
}

def fix_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        return False, str(e)

    new_content = content
    for broken, fixed in replacements.items():
        new_content = new_content.replace(broken, fixed)
        
    # Additional manual fixes for deeply broken stuff like: TuÃ„ÂŸgeneral Ã¢Â€Â”
    new_content = new_content.replace('TuÃ„ÂŸgeneral', 'Tuğgeneral')
    new_content = new_content.replace('Ã¢Â€Â”', '—')
    new_content = new_content.replace('komutanÃ„Â±', 'komutanı')

    if content != new_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        return True, "Fixed"
    return False, "Ok"

fixed_count = 0
for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith(('.ts', '.tsx', '.json')):
            filepath = os.path.join(root, file)
            changed, status = fix_file(filepath)
            if changed:
                print(f"Fixed: {filepath}")
                fixed_count += 1

print(f"\\nTotal files fixed: {fixed_count}")
