import os
import re

# SİSTEM TAKİP PANELİ (STP) - ARINDIRMA PROTOKOLÜ
# Tüm eski isimleri (STP, STP, Sistem Takip Paneli) temizler.

TARGET_DIR = r'c:\Users\Esisya\Desktop\Sistem-Takip-Paneli'
REPLACEMENTS = {
    r'STP': 'STP',
    r'STP': 'STP',
    r'STP': 'STP',
    r'SİSTEM TAKİP PANELİ': 'SİSTEM TAKİP PANELİ',
    r'Sistem Takip Paneli': 'Sistem Takip Paneli',
    r'stp': 'stp',
    r'stp': 'stp'
}

EXCLUDE_DIRS = ['.git', 'node_modules', '.next']

def purge_files():
    for root, dirs, files in os.walk(TARGET_DIR):
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
        for file in files:
            file_path = os.path.join(root, file)
            try:
                # Önce dosya ismini kontrol et
                new_file_name = file
                for old, new in REPLACEMENTS.items():
                    new_file_name = re.sub(old, new, new_file_name, flags=re.IGNORECASE)
                
                final_path = file_path
                if new_file_name != file:
                    final_path = os.path.join(root, new_file_name)
                    os.rename(file_path, final_path)
                    print(f"RESNAME: {file} -> {new_file_name}")

                # Dosya içeriğini temizle
                with open(final_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()

                new_content = content
                for old, new in REPLACEMENTS.items():
                    new_content = re.sub(old, new, new_content)

                if new_content != content:
                    with open(final_path, 'w', encoding='utf-8', errors='ignore') as f:
                        f.write(new_content)
                    print(f"PURGED: {final_path}")

            except Exception as e:
                print(f"ERROR processing {file_path}: {e}")

if __name__ == '__main__':
    purge_files()
    print("\nARINDIRMA TAMAMLANDI. Tüm sistem 'Sistem Takip Paneli' kimliğine büründü.")
