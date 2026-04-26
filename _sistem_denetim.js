'use strict';
const fs   = require('fs');
const path = require('path');

const KOK = path.resolve(__dirname);

const DOSYA_MAP = [
  {
    dosya: 'Gorev_Kabul_Departmani/komut_alim.js',
    beklenen: [
      { mod: '../shared/aiOrchestrator',                          ad: 'aiOrchestrator'       },
      { mod: '../shared/sistemKurallari',                         ad: 'sistemKurallari'       },
      { mod: '../shared/pdp_44',                                  ad: 'pdp_44'               },
      { mod: '../shared/hermai_mimarisi',                         ad: 'hermai_mimarisi'       },
      { mod: '../Agent_Uretim_Departmani/roster/index',           ad: 'roster/index'         },
    ]
  },
  {
    dosya: 'Planlama_Departmani/planlama_islemci.js',
    beklenen: [
      { mod: '../shared/aiOrchestrator',                          ad: 'aiOrchestrator'       },
      { mod: '../Agent_Uretim_Departmani/roster/discipline',      ad: 'discipline (MDS)'     },
      { mod: '../shared/mikroAdimMotoru',                         ad: 'mikroAdimMotoru'       },
      { mod: '../shared/sistemKurallari',                         ad: 'sistemKurallari'       },
      { mod: '../Agent_Uretim_Departmani/roster/index',           ad: 'roster/index'         },
      { mod: './kurul_masasi_motoru',                             ad: 'kurul_masasi_motoru'  },
      { mod: './algoritma_merkezi',                               ad: 'algoritma_merkezi'    },
      { mod: '../shared/hermai_mimarisi',                         ad: 'hermai_mimarisi'       },
    ]
  },
  {
    dosya: 'Planlama_Departmani/index.js',
    beklenen: [
      { mod: './planlama_islemci',                                ad: 'planlama_islemci'     },
      { mod: '../shared/pdp_44',                                  ad: 'pdp_44'               },
      { mod: '../shared/edk_25',                                  ad: 'edk_25'               },
    ]
  },
  {
    dosya: 'Planlama_Departmani/algoritma_merkezi.js',
    beklenen: [
      { mod: '../shared/pdp_44',                                  ad: 'pdp_44'               },
      { mod: '../shared/edk_25',                                  ad: 'edk_25'               },
      { mod: '../shared/karar_aciklama_motoru',                   ad: 'karar_aciklama'       },
      { mod: '../shared/hermai_mimarisi',                         ad: 'hermai_mimarisi'       },
    ]
  },
  {
    dosya: 'Planlama_Departmani/kurul_masasi_motoru.js',
    beklenen: [
      { mod: '../shared/aiOrchestrator',                          ad: 'aiOrchestrator'       },
      { mod: '../Agent_Uretim_Departmani/roster/index',           ad: 'roster/index'         },
      { mod: '../shared/hermai_mimarisi',                         ad: 'hermai_mimarisi'       },
    ]
  },
  {
    dosya: 'shared/aiOrchestrator.js',
    beklenen: [
      { mod: './ai_motorlar',                                     ad: 'ai_motorlar'          },
      { mod: './ai_protokol',                                     ad: 'ai_protokol'          },
      { mod: './edk_25',                                          ad: 'edk_25'               },
    ]
  },
  {
    dosya: 'shared/ai_motorlar.js',
    beklenen: [
      { mod: './pinokio_motorlari',                               ad: 'pinokio_motorlari'    },
    ]
  },
  {
    dosya: 'shared/algoritma_merkezi.js',
    beklenen: [],
    yoksa_atla: true
  },
  {
    dosya: 'WhatsApp_Bot/whatsapp_agent.js',
    beklenen: [
      { mod: '../shared/aiOrchestrator',                          ad: 'aiOrchestrator'       },
    ]
  },
  {
    dosya: 'WhatsApp_Bot/wa_onay_kanali.js',
    beklenen: [
      { mod: '../shared/aiOrchestrator',                          ad: 'aiOrchestrator (varsa)' },
    ],
    yumusak: true
  },
  {
    dosya: 'WhatsApp_Bot/wa_komut_yonetici.js',
    beklenen: [
      { mod: '../shared/aiOrchestrator',                          ad: 'aiOrchestrator (varsa)' },
    ],
    yumusak: true
  },
  {
    dosya: 'Agent_Uretim_Departmani/roster/index.js',
    beklenen: []
  },
  {
    dosya: 'Agent_Uretim_Departmani/roster/uzman_kadro_genisletilmis.js',
    beklenen: []
  },
  {
    dosya: 'Agent_Uretim_Departmani/roster/genisletilmis_takim_2.js',
    beklenen: []
  },
  {
    dosya: 'shared/pinokio_motorlari.js',
    beklenen: []
  },
  {
    dosya: 'shared/edk_25.js',
    beklenen: []
  },
  {
    dosya: 'shared/pdp_44.js',
    beklenen: []
  },
  {
    dosya: 'shared/hermai_mimarisi.js',
    beklenen: []
  },
  {
    dosya: 'shared/mikroAdimMotoru.js',
    beklenen: []
  },
  {
    dosya: 'shared/karar_aciklama_motoru.js',
    beklenen: []
  },
];

let tamam = 0, eksik = 0, yok = 0;
const eksikler = [];

console.log('');
console.log('════════════════════════════════════════════════════════════════════════');
console.log('  STP SİSTEM TAM BAĞLANTI DENETİMİ — ' + new Date().toISOString());
console.log('════════════════════════════════════════════════════════════════════════');

for (const { dosya, beklenen, yoksa_atla, yumusak } of DOSYA_MAP) {
  const tam_yol = path.join(KOK, dosya);
  const var_mi  = fs.existsSync(tam_yol);

  if (!var_mi) {
    if (yoksa_atla) continue;
    console.log('\n❌ DOSYA YOK : ' + dosya);
    yok++;
    continue;
  }

  const icerik   = fs.readFileSync(tam_yol, 'utf8');
  const importler= [];
  const re = /require\(['"]([^'"]+)['"]\)/g;
  let eslesme;
  while ((eslesme = re.exec(icerik)) !== null) importler.push(eslesme[1]);

  if (beklenen.length === 0) {
    console.log('\n✅ VAR (import denetimi yok) : ' + dosya);
    tamam++;
    continue;
  }

  console.log('\n📄 ' + dosya + ' (' + importler.length + ' import)');

  for (const { mod, ad } of beklenen) {
    const bulundu = importler.some(i => i.includes(mod.replace('../','').replace('./','').split('/').pop()));
    if (bulundu) {
      console.log('   ✅ BAĞLI   : ' + ad);
      tamam++;
    } else {
      const simge = yumusak ? '   ⚠️  YUMUŞAK' : '   ❌ EKSİK  ';
      console.log(simge + ' : ' + ad + ' ← beklenen: ' + mod);
      if (!yumusak) {
        eksik++;
        eksikler.push({ dosya, mod, ad });
      }
    }
  }
}

console.log('');
console.log('════════════════════════════════════════════════════════════════════════');
console.log('SONUÇ ÖZET:');
console.log('  ✅ Bağlı  : ' + tamam);
console.log('  ❌ Eksik  : ' + eksik);
console.log('  ❌ Yok    : ' + yok);
console.log('════════════════════════════════════════════════════════════════════════');

if (eksikler.length > 0) {
  console.log('\nEKSİK BAĞLANTILAR (DÜZELTME GEREKTİREN):');
  for (const e of eksikler) {
    console.log('  → ' + e.dosya + ' ← ' + e.ad + ' (' + e.mod + ')');
  }
} else {
  console.log('\n🎯 TÜM BAĞLANTILAR TAMAM. Sistem bütünlüğü doğrulandı.');
}
