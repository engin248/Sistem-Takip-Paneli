// ============================================================
// PROJE PLANI MOTORU — proje_plani_motoru.js
// ============================================================
// Üç bağımsız katman — farklı teknoloji, farklı mantık:
//
// [KATMAN-A] YAPICI MOTOR (Sequential/Forward-chaining)
//   Logic: Hedeften çözüme → Teknoloji → Operasyon
//   Approach: "Bunu nasıl yapabiliriz?"
//
// [KATMAN-B] ANTİ MOTOR (Risk-first/Backward-induction)
//   Logic: Başarısızlıktan geriye → "Neden olmaz?" → Kanıt
//   Approach: "Bu neden başarısız olur?"
//   Her adımı çürütür, varsayım avlar, gerçek riski bulur
//
// [KATMAN-C] ALGORİTMA AÇIKLAYICI (Transparent Reasoning)
//   Her karar neden alındı açıklanır — kara kutu yok
//   AI'ın kendi düşünce sürecini kayıt altına alır
// ============================================================

'use strict';

const AI = require('../shared/aiOrchestrator');
const { edk25CiktiTara } = require('../shared/edk_25');
const { hermAiDongusu } = require('../shared/hermai_mimarisi'); // HermAI — Sadi Evren Şeker YBS 2025

// ── SABITLER ─────────────────────────────────────────────────
const STACK_A_TEKNOLOJI = 'Sequential-Waterfall / Forward-Chaining';
const STACK_B_TEKNOLOJI = 'Risk-First / Backward-Induction / Adversarial';

// ── ARAç: JSON AYRIŞTIRICISI ─────────────────────────────────
function jsonCoz(metin) {
  try {
    const m = (metin || '').match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
  } catch {}
  return null;
}

// ── ARAç: KARAR KAYIT ───────────────────────────────────────
function kararKaydet(kararLog, katman, adim, karar, neden, alternatifler = [], secilen = '') {
  kararLog.push({
    zaman:        new Date().toISOString(),
    katman,
    adim,
    karar,
    neden,
    alternatifler_degerlendirilen: alternatifler,
    secilen_neden: secilen,
  });
}

// ============================================================
// KATMAN-A: YAPICI MOTOR (Sequential Forward-Chaining)
// ============================================================
// Teknoloji: Hedeften başla → adım adım çözüme ilerle
// Her adım bir öncekinin çıktısını giriş olarak alır (pipeline)
// "Bunu nasıl yapabiliriz?" sorusu her aşamada tekrar sorulur
// ============================================================

const YapiciMotor = {

  ad: 'YAPICI-MOTOR',
  teknoloji: STACK_A_TEKNOLOJI,

  async gorevTanimla(gorev, kararLog, log) {
    log('[A1] YAPICI: Görev tanımlanıyor...');
    const sistem = `Sen Proje Planlama Mimarısın (Sequential Yaklaşım).
GÖREV: Her adımı hedeften geriye doğru PLANLA. Forward-chaining mantığı kullan.
Hedefi net tanımla → Başarı kriterlerini belirle → Sınırları çiz.

JSON:
{
  "hedef": "...",
  "basari_kriterleri": ["...", "..."],
  "kapsam": "...",
  "kapsam_disi": "...",
  "onkosullar": ["..."]
}`;
    try {
      const r = await AI.chat(`Görev: "${gorev.content || gorev.title}"`, sistem, { temperature: 0.2 });
      const veri = jsonCoz(r.content || r) || { hedef: gorev.content, basari_kriterleri: [], kapsam: 'Tanımsız', kapsam_disi: '-', onkosullar: [] };
      kararKaydet(kararLog, 'A', 'GorevTanim', veri.hedef, 'Sequential: Hedef önce tanımlanmadan teknoloji seçilmez', ['Hedef odaklı', 'Kapsam odaklı'], 'Hedef odaklı — forward-chain için başlangıç noktası');
      return veri;
    } catch (e) {
      log(`[A1] HATA: ${e.message}`, 'WARN');
      return { hedef: gorev.content, basari_kriterleri: [], kapsam: 'TANIMSIZ', kapsam_disi: '-', onkosullar: [] };
    }
  },

  async teknolojiSec(gorevTanim, kararLog, log) {
    log('[A2] YAPICI: Teknoloji seçiliyor...');
    const sistem = `Sen Teknoloji Mimarısın (Forward-Chaining Mantığı).
Hedef ve kapsama bakarak en uygun teknoloji yığını seç.
Seçimi kanıta dayandır. Her seçimin gerekçesi olmalı.

JSON:
{
  "oneri": {
    "frontend": "...", "backend": "...", "veritabani": "...",
    "ai_katman": "...", "entegrasyon": "...", "altyapi": "..."
  },
  "secim_gerekceleri": {
    "frontend": "Neden bu?",
    "backend": "Neden bu?",
    "veritabani": "Neden bu?"
  },
  "alternatifler_neden_reddedildi": {
    "reddedilen1": "Neden reddedildi?",
    "reddedilen2": "Neden reddedildi?"
  },
  "maliyet_tahmini": "...",
  "sure_tahmini": "..."
}`;
    try {
      const r = await AI.chat(
        `Hedef: ${gorevTanim.hedef}\nKapsam: ${gorevTanim.kapsam}\nÖnkoşullar: ${gorevTanim.onkosullar?.join(', ')}`,
        sistem, { temperature: 0.3 }
      );
      const veri = jsonCoz(r.content || r) || { oneri: {}, secim_gerekceleri: {}, alternatifler_neden_reddedildi: {} };
      kararKaydet(kararLog, 'A', 'TeknolojiSecimi',
        JSON.stringify(veri.oneri),
        'Sequential: Önce hedef belirlendi, teknoloji hedefe göre seçildi',
        Object.keys(veri.alternatifler_neden_reddedildi || {}),
        'Hedef-bağlantılı en düşük bağımlılık'
      );
      return veri;
    } catch (e) {
      log(`[A2] HATA: ${e.message}`, 'WARN');
      return { oneri: { backend: 'Node.js', veritabani: 'Supabase' }, secim_gerekceleri: {} };
    }
  },

  async operasyonPlaniCikar(gorevTanim, teknoloji, kararLog, log) {
    log('[A3] YAPICI: Operasyon planı çıkartılıyor...');
    const tekStack = JSON.stringify(teknoloji.oneri || {});
    const sistem = `Sen Operasyon Planlayıcısısın (Sequential).
Seçilen teknolojiyle hedefi gerçekleştirmek için ADIM ADIM operasyon planı çıkar.
Her işlemde: kontrol noktaları, etki alanları, rollback stratejisi.

JSON:
{
  "fazlar": [
    {
      "faz_no": 1,
      "ad": "...",
      "amac": "...",
      "islemler": [
        { "sira": 1, "islem": "...", "etki_alani": "...", "kontrol_noktasi": "...", "rollback": "..." }
      ],
      "sure": "...",
      "tamamlanma_kriteri": "..."
    }
  ],
  "toplam_sure": "...",
  "kritik_yol": "...",
  "bagimlilıklar": ["..."]
}`;
    try {
      const r = await AI.chat(
        `Hedef: ${gorevTanim.hedef}\nTeknoloji: ${tekStack}`,
        sistem, { temperature: 0.2 }
      );
      const veri = jsonCoz(r.content || r) || { fazlar: [], toplam_sure: 'Belirsiz' };
      kararKaydet(kararLog, 'A', 'OperasyonPlani',
        `${veri.fazlar?.length || 0} faz planlandı`,
        'Sequential: Teknoloji seçildikten sonra operasyon adımları belirlendi',
        ['Tek faz', 'Çok faz', 'Agile sprint'],
        'Çok faz — her faz bağımsız doğrulanabilir'
      );
      return veri;
    } catch (e) {
      log(`[A3] HATA: ${e.message}`, 'WARN');
      return { fazlar: [], toplam_sure: 'HATA' };
    }
  },

  async calistir(gorev, supabase, log) {
    log(`\n${'─'.repeat(60)}`);
    log(`[KATMAN-A] YAPICI MOTOR (${STACK_A_TEKNOLOJI})`);
    log(`${'─'.repeat(60)}`);
    const kararLog = [];
    const baslangic = Date.now();
    const t1 = await this.gorevTanimla(gorev, kararLog, log);
    const t2 = await this.teknolojiSec(t1, kararLog, log);
    const t3 = await this.operasyonPlaniCikar(t1, t2, kararLog, log);
    const sonuc = { katman: 'A', teknoloji: STACK_A_TEKNOLOJI, gorev_tanim: t1, teknoloji_secimi: t2, operasyon_plani: t3, karar_log: kararLog, sure_ms: Date.now() - baslangic };
    log(`[A] TAMAMLANDI — ${t3.fazlar?.length || 0} faz | ${t1.hedef?.substring(0, 50)}`);
    return sonuc;
  },
};

// ============================================================
// KATMAN-B: ANTİ MOTOR (Risk-First / Backward-Induction)
// ============================================================
// Teknoloji: TAMAMEN FARKLI — Başarısızlıktan geriye gider
// Her adımı sorgular: "Bu neden çalışmaz?"
// Varsayım avlar, kör nokta tespit eder, risk zincirleri kurar
// YAPICI motorunun her kararını ayrı ayrı hedef alır
// ============================================================

const AntiMotor = {

  ad: 'ANTİ-MOTOR',
  teknoloji: STACK_B_TEKNOLOJI,

  async basarisizlikSenaryolari(gorev, kararLog, log) {
    log('[B1] ANTİ: Başarısızlık senaryoları üretiliyor...');
    const sistem = `Sen Risk Analisti ve Başarısızlık Uzmanısın (Backward-Induction).
Backward-induction: Projenin BAŞARISIZ olduğunu varsay. Geriye git ve sebepleri bul.
Görevi oku ve "Bu proje neden başarısız olabilir?" sorusunu yanıtla.
Uydurma YASAK. Sadece gerçekçi, kanıtlanabilir başarısızlık senaryoları.

JSON:
{
  "basarisizlik_modlari": [
    { "id": "BM1", "ad": "...", "aciklama": "...", "olasilik": "YÜKSEK/ORTA/DÜŞÜK", "etki": "KRİTİK/ÖNEMLI/MINOR", "kanit": "..." }
  ],
  "kör_noktalar": ["..."],
  "tehlikeli_varsayimlar": ["..."],
  "kurtarma_imkansizligi": "Bu proje hangi noktada geri döndürülemez?"
}`;
    try {
      const r = await AI.chat(`Görev/Proje: "${gorev.content || gorev.title}"`, sistem, { temperature: 0.6 });
      const veri = jsonCoz(r.content || r) || { basarisizlik_modlari: [], kor_noktalar: [], tehlikeli_varsayimlar: [] };
      kararKaydet(kararLog, 'B', 'BasarisizlikAnalizi',
        `${veri.basarisizlik_modlari?.length || 0} başarısızlık modu tespit edildi`,
        'Backward-induction: Önce başarısızlıkları say, sonra çözüme git',
        ['Forward-first (tehlikeli)', 'Backward-induction'], 'Backward — kör noktaları erken yakalar'
      );
      return veri;
    } catch (e) {
      log(`[B1] HATA: ${e.message}`, 'WARN');
      return { basarisizlik_modlari: [], kor_noktalar: [], tehlikeli_varsayimlar: [] };
    }
  },

  async yapiciKararlariSorgu(yapiciSonuc, kararLog, log) {
    log('[B2] ANTİ: Yapıcı kararları sorgulanıyor — "Olmaz çünkü..."');
    const yapiciTekno = JSON.stringify(yapiciSonuc.teknoloji_secimi?.oneri || {});
    const yapiciFaz   = yapiciSonuc.operasyon_plani?.fazlar?.length || 0;

    const sistem = `Sen Zındık Analistisin. Yapıcı motorun kararlarını çürüt.
Her kararı ayrı ayrı sor: "Bu olmaz çünkü..."
Kanıtsız eleştiri YASAK. Her itirazın somut gerekçesi olmalı.

JSON:
{
  "itirazlar": [
    {
      "hedef": "Hangi yapıcı kararı?",
      "iddia": "Yapıcının iddiası",
      "itiraz": "Bu olmaz çünkü...",
      "risk_seviyesi": "KRİTİK/ÖNEMLI/MINOR",
      "kanit_veya_analoji": "...",
      "alternatif_onerim": "..."
    }
  ],
  "en_tehlikeli_karar": "Yapıcının en riskli kararı",
  "genel_degerlendirme": "Proje bu haliyle başarıya ulaşır mı?"
}`;
    try {
      const r = await AI.chat(
        `Yapıcı teknoloji seçimi: ${yapiciTekno}\nFaz sayısı: ${yapiciFaz}\nÖnerilen yaklaşım: ${STACK_A_TEKNOLOJI}`,
        sistem, { temperature: 0.7 }
      );
      const veri = jsonCoz(r.content || r) || { itirazlar: [], en_tehlikeli_karar: 'Belirsiz' };
      kararKaydet(kararLog, 'B', 'YapiciSorgu',
        `${veri.itirazlar?.length || 0} itiraz üretildi`,
        'Adversarial: Yapıcının her kararı karşı kanıtla test edildi',
        ['Kabul et', 'Reddet', 'Koşullu kabul'], 'Adversarial test — kanıt zorunlu'
      );
      return veri;
    } catch (e) {
      log(`[B2] HATA: ${e.message}`, 'WARN');
      return { itirazlar: [], en_tehlikeli_karar: 'Test edilemedi' };
    }
  },

  async alternatifTeknolojiStrat(gorev, yapiciSonuc, kararLog, log) {
    log('[B3] ANTİ: Alternatif teknoloji stratejisi üretiliyor...');
    const sistem = `Sen Alternatif Strateji Mimarısın (Risk-First Yaklaşım).
Yapıcının seçtiği her teknolojiyi reddet. Farklı, hafif, daha az riskli alternatif sun.
Risk-first mantığı: Önce risk al, teknoloji sonra. "En az bağımlılık, en hızlı geri dönüş."

JSON:
{
  "anti_strateji": {
    "frontend": "...", "backend": "...", "veritabani": "...",
    "ai_katman": "...", "entegrasyon": "...", "altyapi": "..."
  },
  "neden_farkli": {
    "frontend": "Yapıcının seçimine karşı gerekçe",
    "backend": "Yapıcının seçimine karşı gerekçe",
    "veritabani": "Yapıcının seçimine karşı gerekçe"
  },
  "risk_azaltma_stratejisi": "...",
  "fallback_plani": "Her şey patlarsa...",
  "minimum_viable": "En küçük çalışan versiyon nedir?"
}`;
    try {
      const r = await AI.chat(
        `Görev: "${gorev.content || gorev.title}"\nYapıcının seçimi: ${JSON.stringify(yapiciSonuc.teknoloji_secimi?.oneri || {})}`,
        sistem, { temperature: 0.5 }
      );
      const veri = jsonCoz(r.content || r) || { anti_strateji: {}, neden_farkli: { genel: 'Analiz yapılamadı' } };
      kararKaydet(kararLog, 'B', 'AntiTeknoloji',
        JSON.stringify(veri.anti_strateji),
        'Risk-first: Yapıcının tersi seçimler — bağımlılık minimizasyonu',
        Object.keys(veri.anti_strateji || {}),
        'Risk-first: Her seçim "hızlı terk edilebilir" kriterine göre'
      );
      return veri;
    } catch (e) {
      log(`[B3] HATA: ${e.message}`, 'WARN');
      return { anti_strateji: {}, neden_farkli: {}, fallback_plani: 'HATA' };
    }
  },

  async calistir(gorev, yapiciSonuc, supabase, log) {
    log(`\n${'─'.repeat(60)}`);
    log(`[KATMAN-B] ANTİ MOTOR (${STACK_B_TEKNOLOJI})`);
    log(`${'─'.repeat(60)}`);
    const kararLog = [];
    const baslangic = Date.now();
    const b1 = await this.basarisizlikSenaryolari(gorev, kararLog, log);
    const b2 = await this.yapiciKararlariSorgu(yapiciSonuc, kararLog, log);
    const b3 = await this.alternatifTeknolojiStrat(gorev, yapiciSonuc, kararLog, log);
    const sonuc = { katman: 'B', teknoloji: STACK_B_TEKNOLOJI, basarisizlik_analizi: b1, yapici_sorgu: b2, anti_teknoloji: b3, karar_log: kararLog, sure_ms: Date.now() - baslangic };
    log(`[B] TAMAMLANDI — ${b1.basarisizlik_modlari?.length || 0} risk modu | ${b2.itirazlar?.length || 0} itiraz`);
    return sonuc;
  },
};

// ============================================================
// KATMAN-C: ALGORİTMA AÇIKLAYICI (Transparent Reasoning)
// ============================================================
// Her kararın arkasındaki algoritmik mantığı açıklar
// Kara kutu yok — AI neden bu kararı aldı?
// Karar ağacı, seçim kriterleri, ağırlıklar görünür
// ============================================================

async function algoritmaAcikla(gorev, yapiciSonuc, antiSonuc, log) {
  log('[C] ALGORİTMA AÇIKLAYICI: Kararlar açıklanıyor...');

  const yapiciKararlar = yapiciSonuc.karar_log?.map(k => `${k.adim}: ${k.karar} (Neden: ${k.neden})`).join('\n') || '';
  const antiKararlar   = antiSonuc.karar_log?.map(k => `${k.adim}: ${k.karar} (Neden: ${k.neden})`).join('\n') || '';

  const sistem = `Sen AI Mimari Karar Açıklayıcısısın.
İki motorun aldığı kararları ALGORİTMİK olarak açıkla.
"Bu karar neden alındı?" sorusunu her karar için yanıtla.
Kara kutu yok. Her seçimin algoritması görünür olmalı.
EDK-25 Kural 16: Belirsizlik gizlenmez, her karar şeffaf.

FORMAT:
[ALGORITMIK_MANTIK]:
[YAPICI_MOTOR_KARAR_AGACI]:
   - Hangi input geldi?
   - Hangi kriter ağırlıklandırıldı?
   - Neden bu seçim?
[ANTI_MOTOR_KARAR_AGACI]:
   - Hangi risk modeli kullanıldı?
   - Neden bu itirazlar seçildi?
[SENTEZ_ALGORITIMI]:
   - İki motor çıktısı nasıl birleştirildi?
   - Ağırlıklandırma nasıl yapıldı?
[FINAL_KARAR_NEDEN]:
   - Seçilen çözüm neden en optimali?
   - Reddedilen neden reddedildi?
[BELIRSIZLIK_NOTU]: (varsa belirsiz noktalar)`;

  try {
    const r = await AI.chat(
      `Görev: "${gorev.content || gorev.title}"\n\nYAPACI KARARLAR:\n${yapiciKararlar}\n\nANTİ KARARLAR:\n${antiKararlar}`,
      sistem, { temperature: 0.1 }
    );
    return {
      aciklama: r.content || r,
      karar_sayisi: (yapiciSonuc.karar_log?.length || 0) + (antiSonuc.karar_log?.length || 0),
      zaman: new Date().toISOString(),
    };
  } catch (e) {
    log(`[C] HATA: ${e.message}`, 'WARN');
    return { aciklama: `Algoritma açıklama hatası: ${e.message}`, karar_sayisi: 0, zaman: new Date().toISOString() };
  }
}

// ============================================================
// ANA MOTOR — projePlaniUret()
// ============================================================
async function projePlaniUret(gorev, supabase, log) {
  const baslangic = Date.now();

  log(`\n${'═'.repeat(60)}`);
  log(`PROJE PLANI MOTORU — ${gorev.task_code || 'ADSIZ'}`);
  log(`Görev: "${(gorev.content || gorev.title || '').substring(0, 80)}"`);
  log(`${'═'.repeat(60)}`);

  // KATMAN-A: Yapıcı (Sequential)
  const yapiciSonuc = await YapiciMotor.calistir(gorev, supabase, log);

  // KATMAN-B: Anti (Risk-First) — Yapıcıyı hedef alır
  const antiSonuc   = await AntiMotor.calistir(gorev, yapiciSonuc, supabase, log);

  // KATMAN-C: Algoritma Açıklayıcı
  log('\n[C] ALGORİTMA AÇIKLAYICI devreye giriyor...');
  const aciklama    = await algoritmaAcikla(gorev, yapiciSonuc, antiSonuc, log);

  // EDK-25 Dürüstlük Kontrolü
  const durustluk = edk25CiktiTara(aciklama.aciklama || '');
  if (!durustluk.gecerli) {
    log(`[EDK-25] Dürüstlük ihlali: ${durustluk.ihlaller.join(' | ')}`, 'WARN');
  }

  // HermAI DöngüSÜ — A+B Katmanlarını Mikro+Makro Yorumla
  // Kaynak: Prof. Dr. Sadi Evren Şeker, YBS Ansiklopedi Cilt 13, Sayı 1, Ocak 2025
  let hermAiSonuc = null;
  try {
    const katmanKararSeti = {
      'KATMAN-A-YAPICI': {
        sonuc: yapiciSonuc.operasyon_plani?.fazlar?.length > 0 ? 'PASS' : 'WARN',
        puan:  Math.min(100, (yapiciSonuc.operasyon_plani?.fazlar?.length || 0) * 20),
        neden: `Sequential motor: ${yapiciSonuc.operasyon_plani?.fazlar?.length || 0} faz planlandı`,
      },
      'KATMAN-B-ANTI': {
        sonuc: (antiSonuc.yapici_sorgu?.itirazlar?.length || 0) > 0 ? 'WARN' : 'PASS',
        puan:  100 - Math.min(100, (antiSonuc.yapici_sorgu?.itirazlar?.length || 0) * 15),
        neden: `Risk-First: ${antiSonuc.yapici_sorgu?.itirazlar?.length || 0} itiraz`,
      },
      'KATMAN-C-ACIKLAMA': {
        sonuc: aciklama.aciklama ? 'PASS' : 'WARN',
        puan:  aciklama.aciklama ? 90 : 30,
        neden: `${aciklama.karar_sayisi} karar açıklandı`,
      },
    };
    hermAiSonuc = await hermAiDongusu(katmanKararSeti, gorev, []);
    log(`[HermAI] Çelişki: ${hermAiSonuc?.celiski?.var ? 'VAR ⚠️' : 'YOK ✅'}`);
  } catch (e) {
    hermAiSonuc = { hata: e.message };
    log(`[HermAI] HATA: ${e.message}`, 'WARN');
  }

  const rapor = {
    gorev_id:   gorev.id,
    task_code:  gorev.task_code,
    baslangic:  new Date(baslangic).toISOString(),
    bitis:      new Date().toISOString(),
    sure_ms:    Date.now() - baslangic,
    yapici:     yapiciSonuc,
    anti:       antiSonuc,
    aciklama,
    edk25_durustluk: durustluk,
    hermai:     hermAiSonuc, // HermAI Mikro+Makro yorum — YBS 2025
  };

  // Supabase kayıt
  if (supabase && gorev.id) {
    try {
      await supabase.from('tasks').update({
        status: 'proje_plani_hazir',
        metadata: {
          ...gorev.metadata,
          proje_plani: {
            sure_ms:      rapor.sure_ms,
            yapici_fazlar: yapiciSonuc.operasyon_plani?.fazlar?.length || 0,
            anti_itiraz:  antiSonuc.yapici_sorgu?.itirazlar?.length || 0,
            kritik_risk:  antiSonuc.basarisizlik_analizi?.basarisizlik_modlari
              ?.filter(m => m.olasilik === 'YÜKSEK' || m.etki === 'KRİTİK')?.length || 0,
            aciklama_ozet: aciklama.aciklama?.substring(0, 300),
          },
        },
        updated_at: new Date().toISOString(),
      }).eq('id', gorev.id);
      log('[PROJEPLANı] Supabase kaydedildi.');
    } catch (e) {
      log(`[PLAN] Supabase hata: ${e.message}`, 'WARN');
    }
  }

  log(`\n${'═'.repeat(60)}`);
  log(`PROJE PLANI HAZIR — ${rapor.sure_ms}ms`);
  log(`  Yapıcı: ${yapiciSonuc.operasyon_plani?.fazlar?.length || 0} faz`);
  log(`  Anti itiraz: ${antiSonuc.yapici_sorgu?.itirazlar?.length || 0} nokta`);
  log(`  Karar açıklaması: ${aciklama.karar_sayisi} karar`);
  log(`${'═'.repeat(60)}`);

  return rapor;
}

module.exports = { projePlaniUret, YapiciMotor, AntiMotor, algoritmaAcikla };
