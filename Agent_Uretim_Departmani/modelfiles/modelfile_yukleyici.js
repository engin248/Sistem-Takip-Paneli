#!/usr/bin/env node
// ============================================================
// UZMANLIK MODELFILE ÜRETİCİ VE YÜKLEYICI
// ============================================================
// Kullanım: node modelfile_yukleyici.js
//   → Her klon-model için Modelfile üretir
//   → ollama create ile sisteme yükler
//   → Sonucu loglar
// ============================================================

const { execSync } = require('child_process');
const fs   = require('fs');
const path = require('path');
const { UZMANLIK_ATAMASI } = require('./uzmanlik_atamasi');

const MODELFILES_DIR = path.join(__dirname);
const LOG_FILE       = path.join(__dirname, 'yukleyici.log');

function log(msg, level = 'INFO') {
  const line = `[${new Date().toISOString()}] [${level}] ${msg}`;
  console.log(line);
  try { fs.appendFileSync(LOG_FILE, line + '\n'); } catch {}
}

function modelfileUret(ajan) {
  // Temiz model adı üret: klon-deepseek-r1-7b → uzman-yazilim-mimari
  const uzmanAd = `uzman-${ajan.uzmanlik.toLowerCase().replace(/_/g, '-')}`;
  const beceriMetni = ajan.beceriler.join(', ');

  const modelfileIcerik = `FROM ${ajan.klon}
SYSTEM """
════════════════════════════════════════════════════════
STP UZMANLIK KARTİ — MDS-160 ONAYLANDI
════════════════════════════════════════════════════════
[UZMANLIK]   : ${ajan.uzmanlik}
[AÇIKLAMA]   : ${ajan.aciklama}
[BECERİLER]  : ${beceriMetni}
════════════════════════════════════════════════════════
GÖREV TALİMATI:
${ajan.sistem_prompt}
════════════════════════════════════════════════════════
DİSİPLİN (İSTİSNASIZ):
• Sadece uzmanlık alanında cevap ver.
• Varsayım yapma — veri yoksa "VERİ YOK" rapor ver.
• Yasaklı kelimeler: "sanırım", "belki", "tabii ki", "elbette"
• Her çıktı FORMAT'a uygun olmalı. Sapma = geçersiz.
• Görev bittiğinde DUR. Ekstra yorum yapma.
════════════════════════════════════════════════════════
"""

PARAMETER temperature 0
PARAMETER num_predict 2000
PARAMETER top_k 10
PARAMETER top_p 0.9`;

  return { uzmanAd, modelfileIcerik };
}

async function main() {
  log('════════ UZMANLIK YÜKLEYİCİ BAŞLADI ════════');
  log(`Toplam ajan: ${UZMANLIK_ATAMASI.length}`);

  const sonuclar = { basarili: [], basarisiz: [] };

  for (let i = 0; i < UZMANLIK_ATAMASI.length; i++) {
    const ajan = UZMANLIK_ATAMASI[i];
    log(`\n[${i+1}/${UZMANLIK_ATAMASI.length}] İşleniyor: ${ajan.klon} → ${ajan.uzmanlik}`);

    const { uzmanAd, modelfileIcerik } = modelfileUret(ajan);
    const modelfilePath = path.join(MODELFILES_DIR, `${uzmanAd}.Modelfile`);

    // Modelfile dosyasını yaz
    try {
      fs.writeFileSync(modelfilePath, modelfileIcerik, 'utf-8');
      log(`  ✅ Modelfile yazıldı: ${modelfilePath}`);
    } catch (e) {
      log(`  ❌ Modelfile yazım hatası: ${e.message}`, 'ERROR');
      sonuclar.basarisiz.push({ uzmanAd, hata: 'modelfile_yazim' });
      continue;
    }

    // Ollama'ya yükle
    try {
      const cmd = `ollama create ${uzmanAd} -f "${modelfilePath}"`;
      log(`  ⚙️  Komut: ${cmd}`);
      const cikti = execSync(cmd, { encoding: 'utf-8', timeout: 120000 });
      log(`  ✅ YÜKLENDI: ${uzmanAd}`);
      sonuclar.basarili.push({ uzmanAd, kaynak: ajan.klon, uzmanlik: ajan.uzmanlik });
    } catch (e) {
      const hata = e.stderr || e.message || 'Bilinmeyen hata';
      log(`  ❌ YÜKLEME HATASI: ${uzmanAd} — ${hata.substring(0, 100)}`, 'ERROR');
      sonuclar.basarisiz.push({ uzmanAd, hata: hata.substring(0, 100) });
    }
  }

  // RAPOR
  log('\n════════ SONUÇ RAPORU ════════');
  log(`✅ Başarılı: ${sonuclar.basarili.length}`);
  log(`❌ Başarısız: ${sonuclar.basarisiz.length}`);

  if (sonuclar.basarili.length > 0) {
    log('\n--- YÜKLENEN UZMANLAR ---');
    sonuclar.basarili.forEach(s => log(`  ✅ ${s.uzmanAd} ← ${s.kaynak} [${s.uzmanlik}]`));
  }
  if (sonuclar.basarisiz.length > 0) {
    log('\n--- BAŞARISIZLAR ---');
    sonuclar.basarisiz.forEach(s => log(`  ❌ ${s.uzmanAd}: ${s.hata}`, 'WARN'));
  }

  // JSON raporu kaydet
  const raporYolu = path.join(MODELFILES_DIR, 'yukleyici_rapor.json');
  fs.writeFileSync(raporYolu, JSON.stringify({ tarih: new Date().toISOString(), ...sonuclar }, null, 2));
  log(`\nRapor kaydedildi: ${raporYolu}`);
  log('════════ TAMAMLANDI ════════');
}

main().catch(e => {
  log(`KRİTİK HATA: ${e.message}`, 'ERROR');
  process.exit(1);
});
