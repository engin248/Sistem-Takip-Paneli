// ============================================================
// ALARM SERVİSİ — STP İÇ ALARM SİSTEMİ
// ============================================================
// STP'nin kendi alarm mekanizması.
// SKM'deki skm_alarmlar tablosundan MODEL alınmıştır:
//   - Tekrar sayacı (3 tekrar → EMERGENCY seviyesi)
//   - Seviye eskalasyonu
//   - Telegram bildirim entegrasyonu
//
// TABLOYA BAĞIMLI DEĞİL — in-memory + audit_logs üzerinden çalışır.
// İleride STP'nin kendi alarm tablosu oluşturulabilir.
//
// Hata Kodu: ERR-STP001-001 (genel)
// ============================================================

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

// ─── IN-MEMORY ALARM DEPOSU ─────────────────────────────────
// Basit in-memory depo. Uygulama yeniden başlatılınca sıfırlanır.
// Kalıcılık için ileride STP alarm tablosu eklenecek.
// ─────────────────────────────────────────────────────────────

const alarmDepo = new Map<string, AlarmKaydi>();
let alarmSayaci = 0;

// ─── ALARM ÜRET ─────────────────────────────────────────────

export interface AlarmUretParams {
  baslik: string;
  aciklama: string;
  seviye?: AlarmSeviye;
  modul: string;
}

/**
 * Alarm üretir. Aynı modül + başlıkta açık alarm varsa tekrar sayacını artırır.
 * 3 tekrar → seviye EMERGENCY'ye yükselir (SKM Kural #49).
 */
export async function alarmUret({
  baslik,
  aciklama,
  seviye = ALARM_SEVIYE.WARNING,
  modul,
}: AlarmUretParams): Promise<{ alarm: AlarmKaydi; yeni: boolean }> {
  const anahtar = `${modul}::${baslik}`;

  // Mevcut açık alarm kontrolü
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

    // Audit log — tekrar kaydı
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

  // Audit log — yeni alarm
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
  const anahtar = `${modul}::${baslik}`;
  const alarm = alarmDepo.get(anahtar);

  if (!alarm) return false;

  alarm.durum = durum;

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

// ─── AÇIK ALARMLARI GETİR ──────────────────────────────────

export function getAcikAlarmlar(): AlarmKaydi[] {
  return Array.from(alarmDepo.values())
    .filter(a => a.durum !== ALARM_DURUM.COZULDU)
    .sort((a, b) => {
      // EMERGENCY önce, sonra tekrar sayısına göre
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
