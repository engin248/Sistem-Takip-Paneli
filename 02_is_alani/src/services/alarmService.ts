// ============================================================
// ALARM SERVİSİ — STP İÇ ALARM SİSTEMİ
// ============================================================
// STP'nin kendi alarm mekanizması.
// SKM'deki skm_alarmlar tablosundan MODEL alınmıştır:
//   - Tekrar sayacı (3 tekrar → EMERGENCY seviyesi)
//   - Seviye eskalasyonu
//   - Telegram bildirim entegrasyonu
//
// DEPOLAMA: stp_alarms tablosu (birincil) + in-memory Map (cache)
//   - Uygulama başlarken DB'den yüklenir
//   - Her alarm değişikliği hem Map hem DB'ye yazılır
//   - Supabase yoksa in-memory only olarak devam eder
//
// Hata Kodu: ERR-STP001-001 (genel)
// ============================================================

import { supabase, validateSupabaseConnection } from '@/lib/supabase';
import { logAudit } from './auditService';
import { sendTelegramNotification, isTelegramNotificationAvailable } from './telegramNotifier';
import { ERR, processError } from '@/lib/errorCore';

// ─── SEVİYELER ──────────────────────────────────────────────

export const ALARM_SEVIYE = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  CRITICAL: 'CRITICAL',
  EMERGENCY: 'EMERGENCY',
} as const;

export type AlarmSeviye = typeof ALARM_SEVIYE[keyof typeof ALARM_SEVIYE];

// ─── ALARM DURUMU ───────────────────────────────────────────

export const ALARM_DURUM = {
  ACIK: 'ACIK',
  GORULDU: 'GORULDU',
  COZULDU: 'COZULDU',
} as const;

export type AlarmDurum = typeof ALARM_DURUM[keyof typeof ALARM_DURUM];

// ─── ALARM KAYDI ────────────────────────────────────────────

export interface AlarmKaydi {
  id: string;
  baslik: string;
  aciklama: string;
  seviye: AlarmSeviye;
  modul: string;
  durum: AlarmDurum;
  tekrar_sayisi: number;
  ilk_tetiklenme: string;
  son_tetiklenme: string;
}

// ─── IN-MEMORY CACHE KATMANI ────────────────────────────────
// stp_alarms tablosu birincil depo.
// Map cache katmanı — DB yavaş gelirse hız sağlar.
// ─────────────────────────────────────────────────────────────

const alarmDepo = new Map<string, AlarmKaydi>();
let alarmSayaci = 0;
let cacheYuklendi = false;

// ─── DB BAĞLANTI KONTROLÜ ───────────────────────────────────

function isDbConnected(): boolean {
  return validateSupabaseConnection().isValid;
}

// ============================================================
// DB SENKRONIZASYON KATMANI
// ============================================================

/** DB'ye alarm yazar veya günceller */
async function persistAlarmToDB(alarm: AlarmKaydi): Promise<void> {
  if (!isDbConnected()) return;

  try {
    await supabase.from('stp_alarms').upsert({
      id: alarm.id,
      baslik: alarm.baslik,
      aciklama: alarm.aciklama,
      seviye: alarm.seviye,
      modul: alarm.modul,
      durum: alarm.durum,
      tekrar_sayisi: alarm.tekrar_sayisi,
      ilk_tetiklenme: alarm.ilk_tetiklenme,
      son_tetiklenme: alarm.son_tetiklenme,
    }, { onConflict: 'id' });
  } catch (err) {
    processError(ERR.SYSTEM_GENERAL, err, {
      kaynak: 'alarmService.ts',
      islem: 'PERSIST_ALARM',
      alarm_id: alarm.id,
    }, 'WARNING');
  }
}

/** DB'den tüm açık alarmları yükler (cache başlatma) */
async function loadAlarmsFromDB(): Promise<void> {
  if (!isDbConnected() || cacheYuklendi) return;

  try {
    const { data, error } = await supabase
      .from('stp_alarms')
      .select('*')
      .neq('durum', 'COZULDU')
      .order('ilk_tetiklenme', { ascending: false });

    if (error) {
      processError(ERR.SYSTEM_GENERAL, error, {
        kaynak: 'alarmService.ts',
        islem: 'LOAD_FROM_DB',
      }, 'WARNING');
      cacheYuklendi = true;
      return;
    }

    if (data) {
      for (const row of data) {
        const alarm: AlarmKaydi = {
          id: row.id as string,
          baslik: row.baslik as string,
          aciklama: row.aciklama as string,
          seviye: row.seviye as AlarmSeviye,
          modul: row.modul as string,
          durum: row.durum as AlarmDurum,
          tekrar_sayisi: row.tekrar_sayisi as number,
          ilk_tetiklenme: row.ilk_tetiklenme as string,
          son_tetiklenme: row.son_tetiklenme as string,
        };
        alarmDepo.set(`${alarm.modul}::${alarm.baslik}`, alarm);
        alarmSayaci = Math.max(alarmSayaci, 1);
      }
    }

    cacheYuklendi = true;
  } catch (err) {
    processError(ERR.SYSTEM_GENERAL, err, {
      kaynak: 'alarmService.ts',
      islem: 'LOAD_FROM_DB',
    }, 'WARNING');
    cacheYuklendi = true;
  }
}

// ============================================================
// 1. ALARM ÜRET
// ============================================================

export interface AlarmUretParams {
  baslik: string;
  aciklama: string;
  seviye?: AlarmSeviye;
  modul: string;
}

/**
 * Alarm üretir. Aynı modül + başlıkta açık alarm varsa tekrar sayacını artırır.
 * 3 tekrar → seviye EMERGENCY'ye yükselir (SKM Kural #49).
 * DB'ye yazılır. Uygulama yeniden başlasa bile alarmlar korunur.
 */
export async function alarmUret({
  baslik,
  aciklama,
  seviye = ALARM_SEVIYE.WARNING,
  modul,
}: AlarmUretParams): Promise<{ alarm: AlarmKaydi; yeni: boolean }> {
  // İlk çağrıda DB'den yükle
  await loadAlarmsFromDB();

  const anahtar = `${modul}::${baslik}`;
  const mevcut = alarmDepo.get(anahtar);

  if (mevcut && mevcut.durum !== ALARM_DURUM.COZULDU) {
    // TEKRAR — sayacı artır
    mevcut.tekrar_sayisi += 1;
    mevcut.son_tetiklenme = new Date().toISOString();

    // 3 tekrar kuralı → EMERGENCY'ye yükselt
    if (mevcut.tekrar_sayisi >= 3 && mevcut.seviye !== ALARM_SEVIYE.EMERGENCY) {
      mevcut.seviye = ALARM_SEVIYE.EMERGENCY;
      mevcut.aciklama = `⛔ 3+ TEKRAR — ACİL MÜDAHALE GEREKLİ | ${aciklama}`;

      // Telegram bildirimi — EMERGENCY
      if (isTelegramNotificationAvailable()) {
        await sendTelegramNotification(
          `🚨 EMERGENCY ALARM\n\n` +
          `📍 Modül: ${modul}\n` +
          `📋 ${baslik}\n` +
          `🔁 Tekrar: ${mevcut.tekrar_sayisi}x\n` +
          `⏰ ${new Date().toISOString()}`
        ).catch(() => {});
      }
    }

    // DB'ye yaz
    await persistAlarmToDB(mevcut);

    // Audit log
    await logAudit({
      operation_type: 'SYSTEM',
      action_description: `Alarm tekrar: "${baslik}" [${modul}] — ${mevcut.tekrar_sayisi}x — ${mevcut.seviye}`,
      metadata: {
        action_code: 'ALARM_REPEAT',
        alarm_id: mevcut.id,
        modul,
        tekrar: mevcut.tekrar_sayisi,
        seviye: mevcut.seviye,
      },
    }).catch(() => {});

    return { alarm: mevcut, yeni: false };
  }

  // YENİ ALARM
  alarmSayaci++;
  const yeniAlarm: AlarmKaydi = {
    id: `ALR-${Date.now()}-${alarmSayaci}`,
    baslik,
    aciklama,
    seviye,
    modul,
    durum: ALARM_DURUM.ACIK,
    tekrar_sayisi: 1,
    ilk_tetiklenme: new Date().toISOString(),
    son_tetiklenme: new Date().toISOString(),
  };

  alarmDepo.set(anahtar, yeniAlarm);

  // DB'ye yaz
  await persistAlarmToDB(yeniAlarm);

  // Audit log
  await logAudit({
    operation_type: 'SYSTEM',
    action_description: `Yeni alarm: "${baslik}" [${modul}] — ${seviye}`,
    metadata: {
      action_code: 'ALARM_CREATED',
      alarm_id: yeniAlarm.id,
      modul,
      seviye,
    },
  }).catch(() => {});

  // Telegram bildirimi — CRITICAL+ seviyede
  if (
    (seviye === ALARM_SEVIYE.CRITICAL || seviye === ALARM_SEVIYE.EMERGENCY) &&
    isTelegramNotificationAvailable()
  ) {
    await sendTelegramNotification(
      `⚠️ ${seviye} ALARM\n\n` +
      `📍 Modül: ${modul}\n` +
      `📋 ${baslik}\n` +
      `📝 ${aciklama}\n` +
      `⏰ ${new Date().toISOString()}`
    ).catch(() => {});
  }

  return { alarm: yeniAlarm, yeni: true };
}

// ─── ALARM DURUMU GÜNCELLE ──────────────────────────────────

export async function alarmDurumGuncelle(modul: string, baslik: string, durum: AlarmDurum): Promise<boolean> {
  await loadAlarmsFromDB();

  const anahtar = `${modul}::${baslik}`;
  const alarm = alarmDepo.get(anahtar);

  if (!alarm) return false;

  alarm.durum = durum;
  alarm.son_tetiklenme = new Date().toISOString();

  // DB'ye yaz
  await persistAlarmToDB(alarm);

  await logAudit({
    operation_type: 'UPDATE',
    action_description: `Alarm durumu güncellendi: "${baslik}" [${modul}] → ${durum}`,
    metadata: {
      action_code: 'ALARM_STATUS_UPDATED',
      alarm_id: alarm.id,
      modul,
      yeni_durum: durum,
    },
  }).catch(() => {});

  return true;
}

// ─── AÇIK ALARMLARI GETİR ───────────────────────────────────

export function getAcikAlarmlar(): AlarmKaydi[] {
  return Array.from(alarmDepo.values())
    .filter(a => a.durum !== ALARM_DURUM.COZULDU)
    .sort((a, b) => {
      const seviyeSirasi: Record<string, number> = { EMERGENCY: 0, CRITICAL: 1, WARNING: 2, INFO: 3 };
      const aSira = seviyeSirasi[a.seviye] ?? 4;
      const bSira = seviyeSirasi[b.seviye] ?? 4;
      if (aSira !== bSira) return aSira - bSira;
      return b.tekrar_sayisi - a.tekrar_sayisi;
    });
}

// ─── ALARM İSTATİSTİKLERİ ───────────────────────────────────

export function getAlarmStats(): {
  toplam: number;
  acik: number;
  emergency: number;
  critical: number;
  warning: number;
} {
  const alarmlar = Array.from(alarmDepo.values());
  const aciklar = alarmlar.filter(a => a.durum !== ALARM_DURUM.COZULDU);

  return {
    toplam: alarmlar.length,
    acik: aciklar.length,
    emergency: aciklar.filter(a => a.seviye === ALARM_SEVIYE.EMERGENCY).length,
    critical: aciklar.filter(a => a.seviye === ALARM_SEVIYE.CRITICAL).length,
    warning: aciklar.filter(a => a.seviye === ALARM_SEVIYE.WARNING).length,
  };
}

// ─── CACHE SIFIRLA (test/restart için) ──────────────────────

export function resetAlarmCache(): void {
  alarmDepo.clear();
  alarmSayaci = 0;
  cacheYuklendi = false;
}
