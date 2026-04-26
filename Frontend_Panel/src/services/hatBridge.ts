// ============================================================
// HAT BRIDGE — Gerçek İcra Hattı Bağlantısı
// KÖK NEDEN: pushToRedLine rastgele HAT-ID üretiyordu.
//            Hiçbir yere gerçekten görev göndermiyordu.
// ÇÖZÜM: Planlama_Departmani API'sine /tasks üzerinden bağlan.
//        Supabase tasks tablosuna PASS işaretlenerek yaz.
// ============================================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export interface HatGorevi {
  baslik: string;
  aciklama?: string;
  oncelik?: 'kritik' | 'yuksek' | 'normal' | 'dusuk';
  kaynak: string;
  metadata?: Record<string, unknown>;
}

export interface HatSonucu {
  success: boolean;
  hat_id: string;
  task_code?: string;
  error?: string;
}

/**
 * pushToRedLine — Görevi icra hattına (RedLine = Supabase tasks) gönderir.
 * KÖK NEDEN DÜZELTİLDİ: Artık gerçekte Supabase'e yazıyor.
 *
 * "RedLine" = Planlama_Departmani motorunun 10sn'de bir taradığı
 *             tasks tablosundaki 'beklemede' kuyruğu.
 */
export async function pushToRedLine(gorev: HatGorevi): Promise<HatSonucu> {
  const hat_id = `HAT-${Date.now()}-${Math.floor(Math.random() * 999)}`;

  if (!supabaseUrl || supabaseUrl.length < 10) {
    console.error('[HAT BRIDGE] Supabase URL tanımlı değil — VERİ HATTI KESİK');
    return { success: false, hat_id, error: 'VERİ HATTI KESİK: Supabase URL eksik' };
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const task_code = `RED-${Date.now()}`;

    // YAPISAL KORUMA: TaskInsert tipi kullaniliyor.
    // Yanlis/eksik kolon yazilirsa TypeScript build aninda yakalar.
    const insertData: import('@/lib/database.types').TaskInsert = {
      task_code,
      title:       gorev.baslik,
      assigned_to: (gorev.metadata?.assignee as string) || 'SISTEM',
      status:      'beklemede',
      priority:    gorev.oncelik || 'normal',
      is_archived: false,
      metadata: {
        kaynak:      gorev.kaynak,
        aciklama:    gorev.aciklama || '',
        hat_id,
        hat_zamani:  new Date().toISOString(),
        ...gorev.metadata,
      },
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('tasks').insert(insertData);

    if (error) {
      console.error(`[HAT BRIDGE] Supabase yazım hatası: ${error.message}`);
      return { success: false, hat_id, error: error.message };
    }

    console.log(`[HAT BRIDGE] ✅ Görev icraya alındı: ${task_code} [${hat_id}]`);
    return { success: true, hat_id, task_code };

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, hat_id, error: msg };
  }
}

/**
 * getHatBridge — Servis nesnesini döndürür
 */
export const getHatBridge = () => ({ pushToRedLine });
