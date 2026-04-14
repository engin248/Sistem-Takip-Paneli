// ============================================================
// AGENT CLONER — BOT KLONLAMA ALGORİTMASI
// ============================================================
// Mevcut ajanlardan yeni ajan üretimi (klonlama).
// AR-GE belgesindeki §2.2 Beceri Boşluğu Giderme Döngüsüne uyar.
//
// KLONLAMA SÜRECİ:
//   1. Kaynak ajan kartı okunur
//   2. Derin kopya alınır (Deep Clone)
//   3. Yeni ID atanır (otomatik)
//   4. Beceri listesi güncellenir (ekleme/çıkarma)
//   5. Kapsam sınırı güncellenir
//   6. Yeni kart registry'ye kaydedilir
//   7. Audit log yazılır
//
// 3 GIDERME YOLU:
//   [YOL 1] İç Eğitim  — Mevcut ajanın becerisini genişlet
//   [YOL 2] Klonlama   — Yeni ajan üret (bu dosya)
//   [YOL 3] Bilgi Getirme — Dış kaynaklardan bilgi al
//
// Hata Kodları:
//   ERR-STP001-048 → Klonlama hatası
//   ERR-STP001-049 → Kapasite boşluğu giderme başarısız
// ============================================================

import { agentRegistry, type AgentCard, type AgentTier, type AgentStatus } from './agentRegistry';
import { ERR, processError } from '@/lib/errorCore';
import { logAudit } from './auditService';

// ─── TİP TANIMLARI ──────────────────────────────────────────

export interface CloneRequest {
  /** Klonlanacak kaynak ajan ID'si */
  kaynakAjanId: string;
  /** Yeni ajanın kod adı */
  yeniKodAdi: string;
  /** Yeni ajanın rol açıklaması */
  yeniRol: string;
  /** Eklenecek beceriler */
  beceriEkleme?: string[];
  /** Çıkarılacak beceriler */
  beceriCikarma?: string[];
  /** Yeni kapsam sınırları (override — yoksa kaynaktan alınır) */
  kapsamSiniri?: string[];
  /** Hedef katman (yoksa kaynaktan alınır) */
  hedefKatman?: AgentTier;
  /** Ek bağımlılıklar */
  ekBagimliliklar?: string[];
}

export interface CloneResult {
  basarili: boolean;
  yeniAjan?: AgentCard;
  hata?: string;
  yol: 'KLONLAMA';
}

export interface EgitimRequest {
  /** Eğitilecek ajan ID'si */
  ajanId: string;
  /** Eklenecek yeni beceriler */
  yeniBeceriler: string[];
  /** Eğitim kaynağı açıklaması */
  egitimKaynagi: string;
}

export interface EgitimResult {
  basarili: boolean;
  eklenenBeceriler: string[];
  hata?: string;
  yol: 'IC_EGITIM';
}

export interface KapasiteAnaliz {
  /** Görev tipi */
  gorevTipi: string;
  /** Bu görevi yapabilecek ajan var mı? */
  kapasiteVar: boolean;
  /** Uygun ajanlar */
  uygunAjanlar: AgentCard[];
  /** Kapasite yoksa önerilen giderme yolu */
  onerilenYol?: 'IC_EGITIM' | 'KLONLAMA' | 'BILGI_GETIRME';
  /** Klonlama için en uygun kaynak ajan */
  klonKaynagi?: AgentCard;
}

// ============================================================
// 1. KAPASİTE ANALİZİ
// ============================================================
// G-3 kapısında çağrılır: Bu görevi yapabilecek ajan var mı?
// Yoksa hangi yolla giderilmeli?
// ============================================================

export function analyzeKapasite(gorevTipi: string): KapasiteAnaliz {
  const uygunAjanlar = agentRegistry.findCapableAgents(gorevTipi);

  if (uygunAjanlar.length > 0) {
    return {
      gorevTipi,
      kapasiteVar: true,
      uygunAjanlar,
    };
  }

  // Kapasite yok — en yakın eşleşmeyi bul
  const tumAjanlar = agentRegistry.getAll().filter(a => a.durum === 'aktif');

  // Her ajan için benzerlik skoru hesapla
  let enYakinAjan: AgentCard | undefined;
  let enYuksekSkor = 0;

  for (const ajan of tumAjanlar) {
    // Basit Jaccard benzerliği — beceri kelimelerinin kesişimi
    const gorevKelimeleri = gorevTipi.toLowerCase().split(/[_\s-]+/);
    const ajanKelimeleri = ajan.beceri_listesi.join(' ').toLowerCase().split(/[_\s-]+/);

    const kesisim = gorevKelimeleri.filter(k => ajanKelimeleri.includes(k)).length;
    const birlesim = new Set([...gorevKelimeleri, ...ajanKelimeleri]).size;
    const skor = birlesim > 0 ? kesisim / birlesim : 0;

    if (skor > enYuksekSkor) {
      enYuksekSkor = skor;
      enYakinAjan = ajan;
    }
  }

  // Giderme yolu önerisi
  let onerilenYol: 'IC_EGITIM' | 'KLONLAMA' | 'BILGI_GETIRME';

  if (enYakinAjan && enYakinAjan.ogrenme_kapasitesi && enYuksekSkor > 0.3) {
    // Yeterince yakın bir ajan var — eğitim yeterli
    onerilenYol = 'IC_EGITIM';
  } else if (enYakinAjan) {
    // Uzak bir ajan var — klonla ve özelleştir
    onerilenYol = 'KLONLAMA';
  } else {
    // Hiç yakın ajan yok — bilgi getirme gerekli
    onerilenYol = 'BILGI_GETIRME';
  }

  return {
    gorevTipi,
    kapasiteVar: false,
    uygunAjanlar: [],
    onerilenYol,
    klonKaynagi: enYakinAjan,
  };
}

// ============================================================
// 2. İÇ EĞİTİM (YOL 1)
// ============================================================
// Mevcut ajanın beceri listesine yeni kural/kapsam enjekte eder.
// Maliyet: SIFIR
// ============================================================

export async function egitAjan(request: EgitimRequest): Promise<EgitimResult> {
  const ajan = agentRegistry.getById(request.ajanId);

  if (!ajan) {
    processError(ERR.AGENT_NOT_FOUND, new Error(`Eğitilecek ajan bulunamadı: ${request.ajanId}`), {
      kaynak: 'agentCloner.ts',
      islem: 'IC_EGITIM',
    });
    return {
      basarili: false,
      eklenenBeceriler: [],
      hata: `Ajan bulunamadı: ${request.ajanId}`,
      yol: 'IC_EGITIM',
    };
  }

  if (!ajan.ogrenme_kapasitesi) {
    return {
      basarili: false,
      eklenenBeceriler: [],
      hata: `Ajan "${ajan.kod_adi}" öğrenme kapasitesine sahip değil`,
      yol: 'IC_EGITIM',
    };
  }

  // Mevcut becerilerde zaten olmayanları filtrele
  const yeniler = request.yeniBeceriler.filter(b => !ajan.beceri_listesi.includes(b));

  if (yeniler.length === 0) {
    return {
      basarili: true,
      eklenenBeceriler: [],
      hata: 'Tüm beceriler zaten mevcut',
      yol: 'IC_EGITIM',
    };
  }

  const eklendi = agentRegistry.addBeceri(request.ajanId, yeniler);

  if (!eklendi) {
    return {
      basarili: false,
      eklenenBeceriler: [],
      hata: 'Beceri ekleme başarısız',
      yol: 'IC_EGITIM',
    };
  }

  // Audit log
  await logAudit({
    operation_type: 'EXECUTE',
    action_description: `İç eğitim: ${ajan.kod_adi} (+${yeniler.length} beceri). Kaynak: ${request.egitimKaynagi}`,
    metadata: {
      action_code: 'AGENT_IC_EGITIM',
      agent_id: ajan.id,
      kod_adi: ajan.kod_adi,
      eklenen_beceriler: yeniler,
      egitim_kaynagi: request.egitimKaynagi,
    },
  }).catch(() => {});

  return {
    basarili: true,
    eklenenBeceriler: yeniler,
    yol: 'IC_EGITIM',
  };
}

// ============================================================
// 3. KLONLAMA (YOL 2)
// ============================================================
// Mevcut bir ajanın derin kopyasını alır,
// beceri/kapsam/rol değiştirilerek yeni ajan oluşturur.
// Maliyet: SIFIR
// ============================================================

export async function klonlaAjan(request: CloneRequest): Promise<CloneResult> {
  // 1. Kaynak ajan kontrolü
  const kaynak = agentRegistry.getById(request.kaynakAjanId);

  if (!kaynak) {
    processError(ERR.AGENT_CLONE, new Error(`Kaynak ajan bulunamadı: ${request.kaynakAjanId}`), {
      kaynak: 'agentCloner.ts',
      islem: 'KLONLAMA',
    });
    return {
      basarili: false,
      hata: `Kaynak ajan bulunamadı: ${request.kaynakAjanId}`,
      yol: 'KLONLAMA',
    };
  }

  // 2. Yeni ID üret
  const yeniId = agentRegistry.getNextAgentId();

  // 3. Derin kopya + değişiklikler
  const yeniBeceriler = [...kaynak.beceri_listesi];

  // Beceri ekleme
  if (request.beceriEkleme) {
    for (const beceri of request.beceriEkleme) {
      if (!yeniBeceriler.includes(beceri)) {
        yeniBeceriler.push(beceri);
      }
    }
  }

  // Beceri çıkarma
  if (request.beceriCikarma) {
    for (const beceri of request.beceriCikarma) {
      const idx = yeniBeceriler.indexOf(beceri);
      if (idx >= 0) yeniBeceriler.splice(idx, 1);
    }
  }

  // 4. Yeni ajan kartı oluştur
  // V6 Kuralı: Yeni klonlanan ajanlar kesinlikle 'pasif' doğar ve Yönetim onayı bekler
  const yeniAjan: AgentCard = {
    id: yeniId,
    kod_adi: request.yeniKodAdi,
    rol: `[ONAY BEKLİYOR] ${request.yeniRol}`,
    katman: request.hedefKatman || kaynak.katman,
    beceri_listesi: yeniBeceriler,
    kapsam_siniri: request.kapsamSiniri || [...kaynak.kapsam_siniri],
    ogrenme_kapasitesi: kaynak.ogrenme_kapasitesi,
    bagimliliklari: [
      ...kaynak.bagimliliklari,
      ...(request.ekBagimliliklar || []),
    ],
    durum: 'pasif' as AgentStatus,
    tamamlanan_gorev: 0,
    hata_sayisi: 0,
    son_aktif: new Date().toISOString(),
    olusturulma: new Date().toISOString(),
    klon_kaynagi: kaynak.id,
    metadata: {
      klonlama_tarihi: new Date().toISOString(),
      kaynak_kod_adi: kaynak.kod_adi,
      kaynak_katman: kaynak.katman,
    },
  };

  // 5. Registry'ye kaydet
  const kayitSonuc = agentRegistry.register(yeniAjan);

  if (!kayitSonuc.success) {
    return {
      basarili: false,
      hata: kayitSonuc.error,
      yol: 'KLONLAMA',
    };
  }

  // 6. Audit log (Yönetim Onay Talebi)
  await logAudit({
    operation_type: 'EXECUTE',
    action_description: `YENİ AJAN KLONLANDI (ONAY BEKLİYOR): ${kaynak.kod_adi} → ${yeniAjan.kod_adi} (${yeniId}). V6 Anayasası gereği ajan 'pasif' statüdedir ve Yönetim Kurulu onayı olmadan hiçbir işlem yapamaz.`,
    metadata: {
      action_code: 'AGENT_CLONE_PENDING',
      kaynak_id: kaynak.id,
      kaynak_kod_adi: kaynak.kod_adi,
      yeni_id: yeniId,
      yeni_kod_adi: yeniAjan.kod_adi,
      eklenen_beceriler: request.beceriEkleme || [],
      cikarilan_beceriler: request.beceriCikarma || [],
      hedef_katman: yeniAjan.katman,
    },
  }).catch(() => {});

  return {
    basarili: true,
    yeniAjan,
    yol: 'KLONLAMA',
  };
}

// ============================================================
// 4. OTOMATİK KAPASİTE GİDERME ORKESTRATÖRÜ
// ============================================================
// G-3 kapısında kapasite boşluğu tespit edildiğinde
// otomatik olarak en uygun giderme yolunu seçer ve uygular.
// ============================================================

export interface KapasiteGidermeSonuc {
  yol: 'IC_EGITIM' | 'KLONLAMA' | 'BILGI_GETIRME' | 'YOK';
  basarili: boolean;
  detay: string;
  ajanId?: string;
}

export async function otomatikKapasiteGider(
  gorevTipi: string,
  gorevAciklama?: string
): Promise<KapasiteGidermeSonuc> {
  // 1. Kapasite analizi
  const analiz = analyzeKapasite(gorevTipi);

  if (analiz.kapasiteVar) {
    return {
      yol: 'YOK',
      basarili: true,
      detay: `Kapasite mevcut. ${analiz.uygunAjanlar.length} uygun ajan bulundu: ${analiz.uygunAjanlar.map(a => a.kod_adi).join(', ')}`,
      ajanId: analiz.uygunAjanlar[0]?.id,
    };
  }

  // 2. Önerilen yola göre giderme
  switch (analiz.onerilenYol) {
    case 'IC_EGITIM': {
      if (!analiz.klonKaynagi) {
        return { yol: 'IC_EGITIM', basarili: false, detay: 'Eğitilecek ajan bulunamadı' };
      }

      const egitimSonuc = await egitAjan({
        ajanId: analiz.klonKaynagi.id,
        yeniBeceriler: gorevTipi.toLowerCase().split(/[_\s-]+/).filter(Boolean),
        egitimKaynagi: `Otomatik kapasite giderme: ${gorevTipi}`,
      });

      return {
        yol: 'IC_EGITIM',
        basarili: egitimSonuc.basarili,
        detay: egitimSonuc.basarili
          ? `${analiz.klonKaynagi.kod_adi} eğitildi (+${egitimSonuc.eklenenBeceriler.length} beceri)`
          : `Eğitim başarısız: ${egitimSonuc.hata}`,
        ajanId: analiz.klonKaynagi.id,
      };
    }

    case 'KLONLAMA': {
      if (!analiz.klonKaynagi) {
        return { yol: 'KLONLAMA', basarili: false, detay: 'Klonlanacak kaynak ajan bulunamadı' };
      }

      const klonSonuc = await klonlaAjan({
        kaynakAjanId: analiz.klonKaynagi.id,
        yeniKodAdi: `KLON-${gorevTipi.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 10)}`,
        yeniRol: `Otomatik klon: ${gorevTipi} görevi için üretildi. ${gorevAciklama || ''}`.trim(),
        beceriEkleme: gorevTipi.toLowerCase().split(/[_\s-]+/).filter(Boolean),
      });

      return {
        yol: 'KLONLAMA',
        basarili: klonSonuc.basarili,
        detay: klonSonuc.basarili
          ? `${analiz.klonKaynagi.kod_adi} → ${klonSonuc.yeniAjan?.kod_adi} klonlandı`
          : `Klonlama başarısız: ${klonSonuc.hata}`,
        ajanId: klonSonuc.yeniAjan?.id,
      };
    }

    case 'BILGI_GETIRME':
    default:
      return {
        yol: 'BILGI_GETIRME',
        basarili: false,
        detay: `"${gorevTipi}" için hiçbir ajan uygun değil. Manuel bilgi getirme gerekli. Kullanıcıya sor.`,
      };
  }
}
