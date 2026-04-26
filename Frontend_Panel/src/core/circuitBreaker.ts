// ============================================================
// CIRCUIT BREAKER — Gerçek Devre Kesici İmplementasyonu
// HATA #1: Önceden fn() doğrudan çalışıyordu, hata sayımı yoktu.
// ============================================================

// Her servis için bağımsız durum tutulur
interface CBDurum {
  hata_sayisi: number;
  son_hata_zamani: number;
  durum: 'KAPALI' | 'ACIK' | 'YARIM_ACIK';
}

const CB_MAP = new Map<string, CBDurum>();
const CB_ESIK     = 5;         // Bu kadar hatadan sonra devre açılır
const CB_BEKLEME  = 30_000;    // 30 sn bekle, sonra YARIM_ACIK'a geç
const CB_DENEME   = 1;         // YARIM_ACIK'ta en fazla 1 istek geçer

function durumuAl(servis: string): CBDurum {
  if (!CB_MAP.has(servis)) {
    CB_MAP.set(servis, { hata_sayisi: 0, son_hata_zamani: 0, durum: 'KAPALI' });
  }
  return CB_MAP.get(servis)!;
}

/**
 * cbSarici — Devre kesiciyle sarılmış fn() çağrısı.
 * KAPALI  = normal çalışma
 * AÇIK    = fallback'e gider (fn() çalışmaz)
 * YARI    = 1 test çağrısı geçer — başarılıysa KAPALI'ya döner
 */
export async function cbSarici<T>(
  servisAdi: string,
  fn: () => Promise<T>,
  fallback: () => T
): Promise<T> {
  const durum = durumuAl(servisAdi);
  const simdi = Date.now();

  // AÇIK durum: bekleme süresi dolmadı → fallback
  if (durum.durum === 'ACIK') {
    if (simdi - durum.son_hata_zamani < CB_BEKLEME) {
      console.warn(`[CB] [${servisAdi}] AÇIK — Fallback devrede.`);
      return fallback();
    }
    // Bekleme doldu → YARIM_ACIK'a geç, test çağrısı izni ver
    durum.durum = 'YARIM_ACIK';
    durum.hata_sayisi = 0;
    console.log(`[CB] [${servisAdi}] YARIM AÇIK — Test çağrısı yapılıyor.`);
  }

  // YARIM_ACIK'ta sadece 1 çağrı geçer
  if (durum.durum === 'YARIM_ACIK' && durum.hata_sayisi >= CB_DENEME) {
    console.warn(`[CB] [${servisAdi}] YARIM AÇIK — Deneme kotası doldu, fallback.`);
    return fallback();
  }

  // KAPALI / YARIM_ACIK — fn() çalıştır
  try {
    const sonuc = await fn();
    // Başarı: KAPALI'ya döndür
    durum.hata_sayisi = 0;
    durum.durum = 'KAPALI';
    return sonuc;
  } catch (err: any) {
    durum.hata_sayisi++;
    durum.son_hata_zamani = Date.now();
    console.error(`[CB] [${servisAdi}] Hata #${durum.hata_sayisi}: ${err.message}`);

    if (durum.hata_sayisi >= CB_ESIK) {
      durum.durum = 'ACIK';
      console.error(`[CB] [${servisAdi}] EŞİK AŞILDI (${CB_ESIK}) — Devre AÇILDI.`);
    }
    return fallback();
  }
}

/** Durum sorgulama (healthcheck için) */
export function getCBDurum(servisAdi?: string) {
  if (servisAdi) {
    return durumuAl(servisAdi);
  }
  const tum: Record<string, CBDurum> = {};
  CB_MAP.forEach((v, k) => { tum[k] = v; });
  return tum;
}
