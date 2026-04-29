// ============================================================
// /api/gorev-karti — Görev Kartı Oluşturucu
// ============================================================
// MİMARİ:
//   Panel → Görev Ata
//    ↓ (1) AI → Tüm Alternatifler Masaya
//    ↓ (2) AI → Alt Kriterler
//    ↓ (3) AI → Her Noktada En İyi Seçim
//    ↓ (4) Algo → 15 Algoritma Pipeline Doğrulaması
//    ↓ (5) AI → İş Sırası + Teknoloji
//    ↓ (6) AI → Kontrol Noktaları + Kriterleri
//    ↓ (7) AI → Operasyon Planı
//    ↓ (8) Çıktı: Görev Kartı → data/gorev_kartlari.json
//    ↓ (9) → Üretim Departmanı
//
// DOKTRIN: Konular değişse de doğru değişmez.
//          Her noktada en iyi kriter seçilir.
//          Alt konular kapandıkça bütün kapanır.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { localInsert, localRead } from '@/lib/localStore';

const OLLAMA_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen3:8b';
const PLANLAMA_MOTOR_URL = 'http://localhost:3099';

// ─── GÖREV KARTI TİPLERİ ─────────────────────────────────────
interface Alternatif {
  id: string;
  baslik: string;
  aciklama: string;
  avantajlar: string[];
  dezavantajlar: string[];
  kriter_puani: number; // 0-100
  secildi: boolean;
}

interface AltKonu {
  baslik: string;
  alternatifler: Alternatif[];
  en_iyi_secim: string;
  secim_gerekce: string;
}

interface IsAdimi {
  sira: number;
  adim: string;
  teknoloji: string;
  sure_tahmini: string;
  onceki_adim: number | null;
  kontrol_noktasi: boolean;
}

interface KontrolNoktasi {
  adim_no: number;
  kriter: string;
  beklenen_cikti: string;
  kabul_kriteri: string;
}

interface GorevKarti {
  id: string;
  gorev: string;
  ajan_id: string;
  ajan_codename: string;
  durum: 'hazirlaniyor' | 'hazir' | 'dogrulanmis' | 'uretimde' | 'tamamlandi';
  // 1. Alternatif Analizi
  alt_konular: AltKonu[];
  // 2. İş Sırası
  is_sirasi: IsAdimi[];
  // 3. Teknoloji Seçimi
  teknoloji_secimi: {
    ana_teknoloji: string;
    yardimci_teknolojiler: string[];
    secim_gerekce: string;
    alternatifleri: string[];
  };
  // 4. Kontrol Noktaları
  kontrol_noktalari: KontrolNoktasi[];
  // 5. Etki Alanları
  etki_alanlari: string[];
  // 6. Operasyon Planı
  operasyon_plani: {
    hedef: string;
    basari_kriteri: string;
    fazlar: { faz: number; baslik: string; adimlar: string[] }[];
    risk_azaltma: string[];
    final_cikti: string;
  };
  // 7. Algoritma Doğrulaması
  algo_dogrulama: {
    pass: number;
    fail: number;
    toplam: number;
    final: string;
    ozet: string;
  } | null;
  // 8. Eksik Ekip / Uzman Talebi
  // Üretim sırasında eksik uzman tespit edilirse otomatik ajan talebi oluşturulur
  eksik_ekip_talebi: {
    var_mi: boolean;
    talepler: {
      uzmanlik: string;
      neden_gerekli: string;
      oncelik: 'KRİTİK' | 'YÜKSEK' | 'NORMAL';
      talep_durum: 'BEKLIYOR' | 'OLUSTURULDU';
    }[];
  };
  // Metadata
  created_at: string;
  _synced: boolean;
}

// ─── OLLAMA ÇAĞRISI ──────────────────────────────────────────
// ─── AŞAMA 5: EKSİK UZMAN TESPİTİ ─────────────────────────────
async function asamaEksikUzmanTespiti(gorev: string, altKonular: AltKonu[], mevcutAjanlar: string[]): Promise<GorevKarti['eksik_ekip_talebi']> {
  const konular = altKonular.map(ak => ak.baslik).join(', ');
  const prompt = `
Görev: "${gorev}"
Alt Konular: ${konular}
Mevcut Ekip: ${mevcutAjanlar.join(', ')}

Bu görevi tamamlamak için mevcut ekipte hangi uzmanlıklar EKSİK?
Eğer eksik yoksa boş dizi döndür.

JSON FORMAT:
{
  "var_mi": true,
  "talepler": [
    {
      "uzmanlik": "Veri Analizi Uzmanı",
      "neden_gerekli": "A/B testi sonuçlarını yorumlamak için",
      "oncelik": "YÜKSEK"
    }
  ]
}`;

  const raw = await ollamaCall(prompt, 30000);
  const parsed = safeJsonParse<{ var_mi: boolean; talepler: GorevKarti['eksik_ekip_talebi']['talepler'] }>(raw, { var_mi: false, talepler: [] });
  return {
    var_mi: parsed.var_mi && (parsed.talepler?.length || 0) > 0,
    talepler: (parsed.talepler || []).map(t => ({ ...t, talep_durum: 'BEKLIYOR' as const })),
  };
}

async function ollamaCall(prompt: string, timeoutMs = 60000): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          {
            role: 'system',
            content: `Sen Sistem Takip Paneli'nin Karar Motorusun. DOKTRIN: Her konuyu tüm alternatifleriyle masaya yatır. Alt kriterleri belirle. Her noktada en iyi olanı seç. Konular değişse de doğru değişmez. ÇIKTI: Daima SADECE geçerli JSON döndür, açıklama yok.`
          },
          { role: 'user', content: prompt }
        ],
        stream: false,
        options: { temperature: 0.3, num_predict: 1500 }
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    const data = await res.json() as { message?: { content?: string } };
    const content = (data.message?.content || '').trim();
    // Markdown kod bloklarını temizle
    return content.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

function safeJsonParse<T>(text: string, fallback: T): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    // JSON içindeki ilk { } bloğunu bulmaya çalış
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]) as T; } catch { /* yoksay */ }
    }
    return fallback;
  }
}

// ─── AŞAMA 1: ALTERNATİFLER + KRITERLER ──────────────────────
async function asamaAlternatifAnalizi(gorev: string): Promise<AltKonu[]> {
  const prompt = `
Görev: "${gorev}"

Bu görevin çözümü için 2-3 ana alt konu belirle.
Her alt konu için 3 farklı alternatif üret.
Her alternatifi kriterler açısından değerlendir ve en iyisini seç.

JSON FORMAT (kesinlikle bu formatta döndür):
{
  "alt_konular": [
    {
      "baslik": "Alt Konu Adı",
      "alternatifler": [
        {
          "id": "A1",
          "baslik": "Alternatif Adı",
          "aciklama": "Kısa açıklama",
          "avantajlar": ["avantaj1", "avantaj2"],
          "dezavantajlar": ["dezavantaj1"],
          "kriter_puani": 85,
          "secildi": false
        }
      ],
      "en_iyi_secim": "Seçilen alternatif ID",
      "secim_gerekce": "Bu seçimin neden en doğru olduğu"
    }
  ]
}`;

  const raw = await ollamaCall(prompt);
  const parsed = safeJsonParse<{ alt_konular: AltKonu[] }>(raw, { alt_konular: [] });

  // En iyi alternatifi işaretle
  return (parsed.alt_konular || []).map(ak => ({
    ...ak,
    alternatifler: (ak.alternatifler || []).map(alt => ({
      ...alt,
      secildi: alt.id === ak.en_iyi_secim
    }))
  }));
}

// ─── AŞAMA 2: İŞ SIRASI + TEKNOLOJİ ──────────────────────────
async function asamaIsSirasiVeTeknoloji(gorev: string, altKonular: AltKonu[]): Promise<{
  is_sirasi: IsAdimi[];
  teknoloji_secimi: GorevKarti['teknoloji_secimi'];
}> {
  const secimler = altKonular.map(ak => `${ak.baslik}: ${ak.en_iyi_secim} (${ak.secim_gerekce})`).join('\n');
  const prompt = `
Görev: "${gorev}"
Seçilen Çözümler:
${secimler}

Bu görevi tamamlamak için:
1. İş sırasını belirle (hangi adım hangisinden sonra gelir)
2. Her adım için teknoloji seç
3. Ana teknoloji kararını ver

JSON FORMAT:
{
  "is_sirasi": [
    {
      "sira": 1,
      "adim": "Adım açıklaması",
      "teknoloji": "Kullanılacak teknoloji",
      "sure_tahmini": "1 saat",
      "onceki_adim": null,
      "kontrol_noktasi": false
    }
  ],
  "teknoloji_secimi": {
    "ana_teknoloji": "Ana teknoloji",
    "yardimci_teknolojiler": ["teknoloji1", "teknoloji2"],
    "secim_gerekce": "Neden bu teknoloji seçildi",
    "alternatifleri": ["alternatif1", "alternatif2"]
  }
}`;

  const raw = await ollamaCall(prompt);
  return safeJsonParse(raw, {
    is_sirasi: [{ sira: 1, adim: gorev, teknoloji: 'Ollama', sure_tahmini: '1 saat', onceki_adim: null, kontrol_noktasi: false }],
    teknoloji_secimi: { ana_teknoloji: 'Ollama (qwen3:8b)', yardimci_teknolojiler: ['Supabase'], secim_gerekce: 'Yerel AI', alternatifleri: [] }
  });
}

// ─── AŞAMA 3: KONTROL NOKTALARI + OPERASYon PLANI ────────────
async function asamaKontrolVeOperasyon(gorev: string, isSirasi: IsAdimi[]): Promise<{
  kontrol_noktalari: KontrolNoktasi[];
  etki_alanlari: string[];
  operasyon_plani: GorevKarti['operasyon_plani'];
}> {
  const adimlar = isSirasi.map(a => `${a.sira}. ${a.adim} (${a.teknoloji})`).join('\n');
  const prompt = `
Görev: "${gorev}"
İş Adımları:
${adimlar}

Belirle:
1. Kontrol noktaları (kritik adımlarda kalite kapıları)
2. Etki alanları (hangi sistemleri/alanları etkiliyor)
3. Tam operasyon planı (hedef, başarı kriteri, fazlar, riskler, final çıktı)

JSON FORMAT:
{
  "kontrol_noktalari": [
    {
      "adim_no": 1,
      "kriter": "Kontrol kriteri",
      "beklenen_cikti": "Ne bekleniyor",
      "kabul_kriteri": "Kabul için şart"
    }
  ],
  "etki_alanlari": ["etki1", "etki2"],
  "operasyon_plani": {
    "hedef": "Görevin nihai hedefi",
    "basari_kriteri": "Başarı nasıl ölçülür",
    "fazlar": [
      {
        "faz": 1,
        "baslik": "Faz Adı",
        "adimlar": ["adım1", "adım2"]
      }
    ],
    "risk_azaltma": ["risk1 → önlem1", "risk2 → önlem2"],
    "final_cikti": "Görev tamamlandığında ortaya çıkan ürün/sonuç"
  }
}`;

  const raw = await ollamaCall(prompt, 90000);
  return safeJsonParse(raw, {
    kontrol_noktalari: [],
    etki_alanlari: ['Sistem geneli'],
    operasyon_plani: {
      hedef: gorev,
      basari_kriteri: 'Görev tamamlanır',
      fazlar: [{ faz: 1, baslik: 'Uygulama', adimlar: [gorev] }],
      risk_azaltma: [],
      final_cikti: 'Tamamlanmış görev'
    }
  });
}

// ─── AŞAMA 4: 15 ALGORİTMA DOĞRULAMASI ───────────────────────
async function asamaAlgoDogrulama(gorev: string, ajanCodename: string): Promise<GorevKarti['algo_dogrulama']> {
  try {
    const res = await fetch(`${PLANLAMA_MOTOR_URL}/gorev-al`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: gorev, task_code: `GK-${Date.now()}`, source: 'gorev_karti', agent: ajanCodename }),
      signal: AbortSignal.timeout(120000),
    });
    const data = await res.json() as { durum?: string; ozet?: { pass: number; fail: number; toplam: number }; neden?: string };
    return {
      pass: data.ozet?.pass || 0,
      fail: data.ozet?.fail || 0,
      toplam: data.ozet?.toplam || 15,
      final: data.durum === 'TAMAM' ? 'ONAY' : 'RED',
      ozet: data.neden || data.durum || 'Motor yanıtı alındı',
    };
  } catch {
    return { pass: 0, fail: 0, toplam: 15, final: 'MOTOR_KAPALI', ozet: 'Planlama Motoru (3099) erişilemedi — Görev Kartı oluşturuldu' };
  }
}

// ─── ANA POST HANDLER ─────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { gorev, ajan_id, ajan_codename } = await req.json();
    if (!gorev) return NextResponse.json({ error: 'Görev metni zorunlu' }, { status: 400 });

    const kartId = `GK-${Date.now()}`;
    console.log(`\n[GÖREV KARTI] ${kartId} — Ajan: ${ajan_codename} — Görev: ${gorev.substring(0, 60)}`);

    // ── AŞAMA 1 ──
    console.log('[GK] Aşama 1: Alternatif analizi...');
    let altKonular: AltKonu[] = [];
    try { altKonular = await asamaAlternatifAnalizi(gorev); }
    catch (e) { console.error('[GK] Aşama 1 hata:', e); }

    // ── AŞAMA 2 ──
    console.log('[GK] Aşama 2: İş sırası + teknoloji...');
    let isSirasiData: { is_sirasi: IsAdimi[]; teknoloji_secimi: GorevKarti['teknoloji_secimi'] } = {
      is_sirasi: [],
      teknoloji_secimi: { ana_teknoloji: 'Ollama', yardimci_teknolojiler: [], secim_gerekce: '', alternatifleri: [] }
    };
    try { isSirasiData = await asamaIsSirasiVeTeknoloji(gorev, altKonular); }
    catch (e) { console.error('[GK] Aşama 2 hata:', e); }

    // ── AŞAMA 3 ──
    console.log('[GK] Aşama 3: Kontrol + operasyon planı...');
    let kontrolData: { kontrol_noktalari: KontrolNoktasi[]; etki_alanlari: string[]; operasyon_plani: GorevKarti['operasyon_plani'] } = {
      kontrol_noktalari: [],
      etki_alanlari: [],
      operasyon_plani: { hedef: gorev, basari_kriteri: '', fazlar: [], risk_azaltma: [], final_cikti: '' }
    };
    try { kontrolData = await asamaKontrolVeOperasyon(gorev, isSirasiData.is_sirasi); }
    catch (e) { console.error('[GK] Aşama 3 hata:', e); }

    // ── AŞAMA 4: 15 Algoritma (paralel çalışır) ──
    console.log('[GK] Aşama 4: 15 Algoritma doğrulaması...');
    const algoDogrulama = await asamaAlgoDogrulama(gorev, ajan_codename);

    // ── AŞAMA 5: EKSİK UZMAN TESPİTİ ──
    console.log('[GK] Aşama 5: Eksik uzman tespiti...');
    const mevcutAjanlar = localRead('agents').map(a => `${(a as Record<string,unknown>).codename} (${(a as Record<string,unknown>).tier})`);
    let eksikEkip: GorevKarti['eksik_ekip_talebi'] = { var_mi: false, talepler: [] };
    try { eksikEkip = await asamaEksikUzmanTespiti(gorev, altKonular, mevcutAjanlar); }
    catch (e) { console.error('[GK] Aşama 5 hata:', e); }

    // Eksik uzman varsa → otomatik ajan talebi oluştur (yerel kayıt)
    if (eksikEkip.var_mi && eksikEkip.talepler.length > 0) {
      console.log(`[GK] ⚠️ ${eksikEkip.talepler.length} eksik uzman tespit edildi — ajan talebi oluşturuluyor...`);
      for (const talep of eksikEkip.talepler) {
        localInsert('agents' as any, {
          id: `TALEP-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
          agent_code: `TALEP-${Date.now()}`,
          codename: `[TALEP] ${talep.uzmanlik}`,
          tier: 'YAZILIM',
          status: 'TALEP',
          specialty: talep.uzmanlik,
          tasks_completed: 0,
          health: 0,
          last_action: `Talep: ${talep.neden_gerekli}`,
          role: talep.neden_gerekli,
          _synced: false,
        });
        talep.talep_durum = 'OLUSTURULDU';
      }
    }

    // ── GÖREV KARTI OLUŞTUR ──
    const kart: GorevKarti = {
      id: kartId,
      gorev,
      ajan_id: ajan_id || 'BILINMIYOR',
      ajan_codename: ajan_codename || 'SİSTEM',
      durum: algoDogrulama?.final === 'ONAY' ? 'dogrulanmis' : 'hazir',
      alt_konular: altKonular,
      is_sirasi: isSirasiData.is_sirasi,
      teknoloji_secimi: isSirasiData.teknoloji_secimi,
      kontrol_noktalari: kontrolData.kontrol_noktalari,
      etki_alanlari: kontrolData.etki_alanlari,
      operasyon_plani: kontrolData.operasyon_plani,
      algo_dogrulama: algoDogrulama,
      eksik_ekip_talebi: eksikEkip,
      created_at: new Date().toISOString(),
      _synced: false,
    };

    // ── YEREL KAYIT ──
    localInsert('gorev_kartlari' as Parameters<typeof localInsert>[0], kart as unknown as Record<string, unknown>);
    
    // ── AJANIN SON AKSİYONUNU GÜNCELLE ──
    const agentsList = localRead('agents');
    const agentIdx = agentsList.findIndex(a => (a as Record<string, unknown>).id === ajan_id);
    if (agentIdx !== -1) {
      const updated = [...agentsList];
      updated[agentIdx] = {
        ...(updated[agentIdx] as Record<string, unknown>),
        status: 'MESGUL',
        last_action: `GK: ${gorev.substring(0, 60)}...`,
        _synced: false,
        updated_at: new Date().toISOString(),
      };
    }

    console.log(`[GÖREV KARTI] ✅ ${kartId} hazır — Durum: ${kart.durum}`);

    return NextResponse.json({
      success: true,
      kart_id: kartId,
      durum: kart.durum,
      kart,
      ozet: {
        alt_konu_sayisi: altKonular.length,
        is_adim_sayisi: isSirasiData.is_sirasi.length,
        kontrol_noktasi_sayisi: kontrolData.kontrol_noktalari.length,
        algo_sonuc: algoDogrulama?.final || 'YOK',
        eksik_uzman_sayisi: eksikEkip.talepler.length,
        message: eksikEkip.var_mi
          ? `⚠️ Görev Kartı hazır — ${eksikEkip.talepler.length} eksik uzman tespit edildi, ajan talebi oluşturuldu`
          : `✅ Görev Kartı hazır — ${ajan_codename} ajanına atandı`,
      }
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[GÖREV KARTI] HATA:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// ─── GET: Tüm Görev Kartlarını Listele ───────────────────────
export async function GET() {
  try {
    const kartlar = localRead('gorev_kartlari' as Parameters<typeof localRead>[0]);
    return NextResponse.json({ kartlar, toplam: kartlar.length });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
