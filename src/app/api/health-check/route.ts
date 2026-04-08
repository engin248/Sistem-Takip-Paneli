/**
 * Sistem Kontrol Merkezi — Health Check API
 * Kayıtlı tüm sistemleri kontrol eder, sonuçları veritabanına yazar
 * GET /api/health-check → tüm sistemleri kontrol et
 */
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Sistem {
    id: string;
    ad: string;
    url: string | null;
    health_endpoint: string | null;
    durum: string;
}

interface KontrolSonuc {
    durum: string;
    yanit_suresi_ms: number;
    hata: string | null;
}

async function sistemKontrolEt(sistem: Sistem): Promise<KontrolSonuc> {
    if (!sistem.url || !sistem.health_endpoint) {
        return { durum: 'bilinmiyor', yanit_suresi_ms: 0, hata: 'URL veya endpoint tanımlanmamış' };
    }

    const url = sistem.url.replace(/\/$/, '') + sistem.health_endpoint;
    const baslangic = Date.now();

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000); // 10 saniye timeout

        const res = await fetch(url, {
            signal: controller.signal,
            headers: { 'User-Agent': 'SistemKontrolMerkezi/1.0' },
        });
        clearTimeout(timeout);

        const sure = Date.now() - baslangic;

        if (res.ok) {
            return { durum: 'saglikli', yanit_suresi_ms: sure, hata: null };
        } else {
            return { durum: 'hasta', yanit_suresi_ms: sure, hata: `HTTP ${res.status}` };
        }
    } catch (err: unknown) {
        const sure = Date.now() - baslangic;
        const message = err instanceof Error ? err.message : String(err);
        return { durum: 'ulasilamaz', yanit_suresi_ms: sure, hata: message };
    }
}

export async function GET(): Promise<Response> {
    try {
        // Tüm aktif/pasif sistemleri al (planlanan hariç — kontrol edilemez)
        const { data: sistemler, error } = await supabase
            .from('skm_sistemler')
            .select('*')
            .in('durum', ['aktif', 'pasif', 'bakim', 'hata']);

        if (error) throw error;

        const sonuclar: Array<{ sistem: string; durum: string; sure_ms: number; hata: string | null }> = [];

        for (const sistem of (sistemler || []) as Sistem[]) {
            const kontrol = await sistemKontrolEt(sistem);

            // Sistem tablosunu güncelle
            await supabase
                .from('skm_sistemler')
                .update({
                    son_saglik: kontrol.durum,
                    son_kontrol: new Date().toISOString(),
                    yanit_suresi_ms: kontrol.yanit_suresi_ms,
                    guncelleme: new Date().toISOString(),
                })
                .eq('id', sistem.id);

            // Sağlık kaydı oluştur
            await supabase
                .from('skm_saglik_kayitlari')
                .insert({
                    sistem_id: sistem.id,
                    durum: kontrol.durum,
                    yanit_suresi_ms: kontrol.yanit_suresi_ms,
                    hata_mesaji: kontrol.hata,
                });

            sonuclar.push({
                sistem: sistem.ad,
                durum: kontrol.durum,
                sure_ms: kontrol.yanit_suresi_ms,
                hata: kontrol.hata,
            });
        }

        return Response.json({
            basarili: true,
            kontrol_zamani: new Date().toISOString(),
            sistemler: sonuclar,
            toplam: sonuclar.length,
            saglikli: sonuclar.filter(s => s.durum === 'saglikli').length,
            hasta: sonuclar.filter(s => s.durum === 'hasta').length,
            ulasilamaz: sonuclar.filter(s => s.durum === 'ulasilamaz').length,
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return Response.json({ basarili: false, hata: message }, { status: 500 });
    }
}
