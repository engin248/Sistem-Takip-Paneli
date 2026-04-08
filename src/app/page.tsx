'use client';
import { useState, useEffect } from 'react';
import { supabase, supabaseBagliMi } from '@/lib/supabase';
import { skmDurumGetir, SEVIYE, ALARM_DURUM, alarmGuncelle } from '@/lib/skm';
import type { SkmAlarm, SkmOlay } from '@/lib/skm';
import { Shield, AlertTriangle, CheckCircle, XCircle, Clock, Activity, Bell, Eye, Zap, RefreshCw, Server, Database, Wifi, WifiOff } from 'lucide-react';

// ─── SEVİYE RENKLERİ ────────────────────────────────────────────
const SEVIYE_RENK: Record<string, string> = {
  DEBUG: '#64748b',
  INFO: '#3b82f6',
  WARNING: '#f59e0b',
  CRITICAL: '#ef4444',
  EMERGENCY: '#dc2626',
};

// ─── ZAMAN FORMAT ────────────────────────────────────────────────
function zamanFormat(tarih: string | null): string {
  if (!tarih) return '-';
  return new Date(tarih).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function tarihFormat(tarih: string | Date | null): string {
  if (!tarih) return '-';
  const d = new Date(tarih);
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' }) + ' ' + zamanFormat(typeof tarih === 'string' ? tarih : tarih.toISOString());
}

// ─── TİP TANIMLARI ──────────────────────────────────────────────
interface SistemKayit {
  id: string;
  ad: string;
  aciklama: string;
  url: string | null;
  durum: string;
  son_saglik: string;
  son_kontrol: string | null;
  yanit_suresi_ms: number | null;
}

interface KontrolSayilari {
  toplam: number;
  onay: number;
  red: number;
  bekliyor: number;
}

interface SkmDurumVeri {
  bugunOlaylar: number;
  acikAlarmlar: SkmAlarm[];
  kontrolSayilari: KontrolSayilari;
  sonOlaylar: SkmOlay[];
  sistemSagligi: string;
}

// ═══════════════════════════════════════════════════════════════════
// SİSTEM KONTROL MERKEZİ — ANA SAYFA
// ═══════════════════════════════════════════════════════════════════
export default function SistemKontrolMerkezi() {
  const [durum, setDurum] = useState<SkmDurumVeri | null>(null);
  const [yukleniyor, setYukleniyor] = useState<boolean>(true);
  const [sonGuncelleme, setSonGuncelleme] = useState<Date | null>(null);
  const [canliOlaylar, setCanliOlaylar] = useState<SkmOlay[]>([]);
  const [sistemler, setSistemler] = useState<SistemKayit[]>([]);
  const [saglikKontrolYukleniyor, setSaglikKontrolYukleniyor] = useState<boolean>(false);

  // ─── SİSTEMLERİ YÜKLE ───────────────────────────────────────
  const sistemleriYukle = async () => {
    if (!supabaseBagliMi) return;
    const { data } = await supabase
      .from('skm_sistemler')
      .select('*')
      .order('olusturulma', { ascending: true });
    if (data) setSistemler(data as SistemKayit[]);
  };

  // ─── SAĞLIK KONTROLÜ ────────────────────────────────────────
  const saglikKontrolYap = async () => {
    setSaglikKontrolYukleniyor(true);
    try {
      await fetch('/api/health-check');
      await sistemleriYukle();
    } catch (err) {
      console.error('[KONTROL] Sağlık kontrolü hatası:', err);
    }
    setSaglikKontrolYukleniyor(false);
  };

  // ─── VERİ YÜKLE ─────────────────────────────────────────────
  const verileriYukle = async () => {
    if (!supabaseBagliMi) {
      setYukleniyor(false);
      return;
    }
    const sonuc = await skmDurumGetir();
    if (sonuc.basarili && sonuc.durum) {
      setDurum(sonuc.durum);
      setSonGuncelleme(new Date());
    }
    setYukleniyor(false);
  };

  useEffect(() => {
    verileriYukle();
    sistemleriYukle();
    const interval = setInterval(() => { verileriYukle(); sistemleriYukle(); }, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── CANLI OLAY AKIŞI (Supabase Realtime) ──────────────────
  useEffect(() => {
    if (!supabaseBagliMi) return;
    const kanal = supabase.channel('kontrol_merkezi_canli')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'skm_olaylar',
      }, (payload) => {
        setCanliOlaylar(prev => [payload.new as SkmOlay, ...prev].slice(0, 50));
        verileriYukle();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'skm_alarmlar',
      }, () => {
        verileriYukle();
      })
      .subscribe();
    return () => { supabase.removeChannel(kanal); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── BAĞLANTI YOK EKRANI ────────────────────────────────────
  if (!supabaseBagliMi) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ textAlign: 'center', maxWidth: 600 }} className="animate-fade-in">
          <Shield size={64} style={{ color: '#10b981', marginBottom: 24 }} />
          <h1 style={{ fontSize: '2rem', fontWeight: 900, color: '#e2e8f0', letterSpacing: '0.05em', marginBottom: 8 }}>
            SİSTEM KONTROL MERKEZİ
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: 32 }}>
            Tüm sistemleri izleyen · kontrol eden · denetleyen bağımsız komuta merkezi
          </p>

          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: '1.5rem', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginBottom: 12 }}>
              <WifiOff size={20} style={{ color: '#ef4444' }} />
              <span style={{ color: '#ef4444', fontWeight: 800, fontSize: '0.9rem' }}>VERİTABANI BAĞLANTISI YOK</span>
            </div>
            <p style={{ color: '#94a3b8', fontSize: '0.8rem', lineHeight: 1.6 }}>
              <code style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: 4, fontSize: '0.75rem' }}>.env.local</code> dosyasına Supabase bilgilerini girin:
            </p>
            <pre style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: '1rem', marginTop: 12, fontSize: '0.75rem', color: '#10b981', textAlign: 'left', overflow: 'auto' }}>
              {`NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co\nNEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...`}
            </pre>
          </div>

          <div style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 12, padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginBottom: 12 }}>
              <Database size={20} style={{ color: '#3b82f6' }} />
              <span style={{ color: '#3b82f6', fontWeight: 800, fontSize: '0.9rem' }}>TABLO KURULUMU</span>
            </div>
            <p style={{ color: '#94a3b8', fontSize: '0.8rem', lineHeight: 1.6 }}>
              Bağlantı sağlandıktan sonra <code style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: 4, fontSize: '0.75rem' }}>database/skm_kurulum.sql</code> dosyasını Supabase SQL Editor&apos;de çalıştırın.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── YÜKLENİYOR ─────────────────────────────────────────────
  if (yukleniyor) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center' }} className="animate-fade-in">
          <Shield size={56} style={{ color: '#10b981', marginBottom: 16 }} className="animate-pulse" />
          <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#e2e8f0', letterSpacing: '0.05em' }}>
            SİSTEM KONTROL MERKEZİ YÜKLENİYOR...
          </div>
        </div>
      </div>
    );
  }

  const acikAlarmSayisi = durum?.acikAlarmlar?.length || 0;
  const kritikAlarmSayisi = durum?.acikAlarmlar?.filter(a => a.seviye === 'CRITICAL' || a.seviye === 'EMERGENCY').length || 0;
  const olaylar: SkmOlay[] = canliOlaylar.length > 0 ? canliOlaylar : (durum?.sonOlaylar || []);
  const saglikli = durum?.sistemSagligi === 'SAGLIKLI';

  return (
    <div style={{ minHeight: '100vh', padding: '1.5rem' }} className="animate-fade-in">

      {/* ─── BAŞLIK BAR ──────────────────────────────────────── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem',
        borderBottom: '1px solid var(--border)', paddingBottom: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: saglikli ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `1px solid ${saglikli ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`
          }}>
            <Shield size={26} style={{ color: saglikli ? '#10b981' : '#ef4444' }} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#e2e8f0', letterSpacing: '0.05em' }}>
              SİSTEM KONTROL MERKEZİ
            </h1>
            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, marginTop: 2 }}>
              Çift Kontrol · Değiştirilmez Kayıt · Gerçek Zamanlı İzleme
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            padding: '8px 16px', borderRadius: 999, fontSize: '0.78rem', fontWeight: 800,
            background: saglikli ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
            color: saglikli ? '#10b981' : '#ef4444',
            border: `1px solid ${saglikli ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
          }}>
            {saglikli ? '✅ SİSTEM SAĞLIKLI' : '⛔ KRİTİK ALARM'}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#22c55e', fontSize: '0.7rem', fontWeight: 600 }}>
            <Wifi size={14} /> Bağlı
          </div>
          <button onClick={verileriYukle}
            style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)', color: '#60a5fa', padding: '8px 12px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.72rem', fontWeight: 700 }}>
            <RefreshCw size={14} /> Yenile
          </button>
        </div>
      </div>

      {/* ─── ÜST METRİK KARTLARI ──────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '0.85rem', marginBottom: '1.5rem' }}>
        <MetrikKart ikon={<Activity size={22} />} baslik="Bugünkü Olaylar" deger={durum?.bugunOlaylar || 0} renk="#3b82f6" />
        <MetrikKart ikon={<CheckCircle size={22} />} baslik="Çift Kontrol Onay" deger={durum?.kontrolSayilari?.onay || 0} renk="#22c55e" />
        <MetrikKart ikon={<XCircle size={22} />} baslik="Çift Kontrol Red" deger={durum?.kontrolSayilari?.red || 0} renk="#ef4444" />
        <MetrikKart ikon={<Clock size={22} />} baslik="Bekleyen Kontrol" deger={durum?.kontrolSayilari?.bekliyor || 0} renk="#f59e0b" />
        <MetrikKart ikon={<Bell size={22} />} baslik="Açık Alarm" deger={acikAlarmSayisi} renk={acikAlarmSayisi > 0 ? '#ef4444' : '#22c55e'} />
        <MetrikKart ikon={<AlertTriangle size={22} />} baslik="Kritik Alarm" deger={kritikAlarmSayisi} renk={kritikAlarmSayisi > 0 ? '#dc2626' : '#22c55e'} />
      </div>

      {/* ─── İZLENEN SİSTEMLER ─────────────────────────────── */}
      <div style={{
        marginBottom: '1.5rem', padding: '1rem',
        background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
          <h3 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Server size={16} style={{ color: '#8b5cf6' }} />
            İZLENEN SİSTEMLER
            <span style={{ background: 'rgba(139,92,246,0.15)', color: '#8b5cf6', padding: '2px 10px', borderRadius: 999, fontSize: '0.62rem', fontWeight: 800 }}>
              {sistemler.length}
            </span>
          </h3>
          <button onClick={saglikKontrolYap} disabled={saglikKontrolYukleniyor}
            style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', color: '#10b981', padding: '6px 14px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.7rem', fontWeight: 700, opacity: saglikKontrolYukleniyor ? 0.5 : 1 }}>
            <Activity size={13} /> {saglikKontrolYukleniyor ? 'Kontrol ediliyor...' : 'Sağlık Kontrolü'}
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
          {sistemler.length > 0 ? sistemler.map(s => (
            <SistemKarti key={s.id} sistem={s} />
          )) : (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '1.5rem', color: '#64748b', fontSize: '0.8rem' }}>
              Tablolar oluşturulduktan sonra sistemler burada görünecek
            </div>
          )}
        </div>
      </div>

      {/* ─── İKİ SÜTUN: ALARMLAR + CANLI AKIŞ ─────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>

        {/* SOL: ALARMLAR */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 14, padding: '1.15rem', border: '1px solid var(--border)' }}>
          <h3 style={{ margin: '0 0 0.85rem', fontSize: '0.9rem', fontWeight: 800, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bell size={16} style={{ color: '#f59e0b' }} />
            ALARM PANELİ
            {acikAlarmSayisi > 0 && (
              <span style={{ background: '#ef4444', color: 'white', padding: '2px 10px', borderRadius: 999, fontSize: '0.65rem', fontWeight: 800 }}>
                {acikAlarmSayisi}
              </span>
            )}
          </h3>
          <div style={{ maxHeight: 420, overflowY: 'auto' }}>
            {durum?.acikAlarmlar?.length && durum.acikAlarmlar.length > 0 ? durum.acikAlarmlar.map(alarm => (
              <AlarmKarti key={alarm.id} alarm={alarm} yenile={verileriYukle} />
            )) : (
              <div style={{ textAlign: 'center', padding: '2.5rem', color: '#22c55e', fontSize: '0.85rem', fontWeight: 700 }}>
                ✅ Açık alarm yok — sistem temiz
              </div>
            )}
          </div>
        </div>

        {/* SAĞ: CANLI OLAY AKIŞI */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 14, padding: '1.15rem', border: '1px solid var(--border)' }}>
          <h3 style={{ margin: '0 0 0.85rem', fontSize: '0.9rem', fontWeight: 800, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Zap size={16} style={{ color: '#3b82f6' }} />
            CANLI OLAY AKIŞI
          </h3>
          <div style={{ maxHeight: 420, overflowY: 'auto' }}>
            {olaylar.length > 0 ? olaylar.map(olay => (
              <OlaySatiri key={olay.id} olay={olay} />
            )) : (
              <div style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b', fontSize: '0.85rem' }}>
                Tablolar Supabase&apos;de oluşturulduğunda veriler burada görünecek
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── ALT: ÇİFT KONTROL GRAFIĞI ────────────────────── */}
      <div style={{
        marginTop: '1rem', background: 'var(--bg-card)', borderRadius: 14, padding: '1.15rem',
        border: '1px solid var(--border)'
      }}>
        <h3 style={{ margin: '0 0 0.85rem', fontSize: '0.9rem', fontWeight: 800, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Eye size={16} style={{ color: '#8b5cf6' }} />
          ÇİFT KONTROL DURUMU
        </h3>
        <CiftKontrolBar kontroller={durum?.kontrolSayilari || null} />
      </div>

      {/* ─── SON GÜNCELLEME ─────────────────────────────────── */}
      {sonGuncelleme && (
        <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.68rem', color: '#475569' }}>
          Son güncelleme: {tarihFormat(sonGuncelleme)} · 30 saniyede bir otomatik yenilenir
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// BİLEŞENLER
// ═══════════════════════════════════════════════════════════════════

interface MetrikKartProps {
  ikon: React.ReactNode;
  baslik: string;
  deger: number;
  renk: string;
}

function MetrikKart({ ikon, baslik, deger, renk }: MetrikKartProps) {
  return (
    <div style={{
      background: 'var(--bg-card)', borderRadius: 12, padding: '1rem',
      border: `1px solid ${renk}18`, display: 'flex', alignItems: 'center', gap: 14,
      transition: 'all 0.2s ease',
    }}>
      <div style={{ color: renk, opacity: 0.9 }}>{ikon}</div>
      <div>
        <div style={{ fontSize: '1.5rem', fontWeight: 900, color: renk }}>{deger}</div>
        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{baslik}</div>
      </div>
    </div>
  );
}

function SistemKarti({ sistem }: { sistem: SistemKayit }) {
  const durumRenk: Record<string, string> = { aktif: '#22c55e', pasif: '#f59e0b', bakim: '#3b82f6', hata: '#ef4444', planlaniyor: '#64748b' };
  const durumIkon: Record<string, string> = { aktif: '●', pasif: '◐', bakim: '🔧', hata: '⛔', planlaniyor: '○' };
  const saglikRenk: Record<string, string> = { saglikli: '#22c55e', hasta: '#f59e0b', ulasilamaz: '#ef4444', bilinmiyor: '#64748b' };
  const saglikIkon: Record<string, string> = { saglikli: '💚', hasta: '💛', ulasilamaz: '❌', bilinmiyor: '❓' };
  return (
    <div style={{
      background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: '0.85rem',
      border: `1px solid ${saglikRenk[sistem.son_saglik] || 'var(--border)'}20`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontWeight: 800, fontSize: '0.82rem', color: '#e2e8f0' }}>{sistem.ad}</span>
        <span style={{ color: durumRenk[sistem.durum], fontSize: '0.65rem', fontWeight: 700 }}>
          {durumIkon[sistem.durum]} {sistem.durum}
        </span>
      </div>
      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{sistem.aciklama}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
        <span style={{ fontSize: '0.6rem', color: '#475569' }}>{sistem.url || '—'}</span>
        <span style={{ fontSize: '0.6rem', fontWeight: 700, color: saglikRenk[sistem.son_saglik] }}>
          {saglikIkon[sistem.son_saglik]} {sistem.son_saglik}
          {sistem.yanit_suresi_ms ? ` (${sistem.yanit_suresi_ms}ms)` : ''}
        </span>
      </div>
      {sistem.son_kontrol && (
        <div style={{ fontSize: '0.55rem', color: '#374151', marginTop: 3, textAlign: 'right' }}>
          Son kontrol: {zamanFormat(sistem.son_kontrol)}
        </div>
      )}
    </div>
  );
}

function AlarmKarti({ alarm, yenile }: { alarm: SkmAlarm; yenile: () => void }) {
  const gorulduYap = async () => {
    await alarmGuncelle({ alarmId: alarm.id, durum: ALARM_DURUM.GORULDU });
    yenile();
  };
  return (
    <div style={{
      background: `${SEVIYE_RENK[alarm.seviye]}08`, borderRadius: 10, padding: '0.75rem',
      marginBottom: '0.5rem', borderLeft: `3px solid ${SEVIYE_RENK[alarm.seviye]}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '0.78rem', fontWeight: 800, color: SEVIYE_RENK[alarm.seviye] }}>
            {alarm.seviye} — {alarm.baslik}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 3 }}>{alarm.aciklama}</div>
          <div style={{ fontSize: '0.62rem', color: '#475569', marginTop: 5 }}>
            {alarm.modul} · {zamanFormat(alarm.olusturulma)}
            {alarm.tekrar_sayisi > 1 && (
              <span style={{ color: '#ef4444', fontWeight: 800 }}> · {alarm.tekrar_sayisi}x tekrar</span>
            )}
          </div>
        </div>
        {alarm.durum === 'ACIK' && (
          <button onClick={gorulduYap}
            style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.25)', color: '#60a5fa', padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: '0.62rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
            Görüldü
          </button>
        )}
      </div>
    </div>
  );
}

function OlaySatiri({ olay }: { olay: SkmOlay }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '0.45rem 0',
      borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '0.74rem',
    }}>
      <span style={{
        width: 7, height: 7, borderRadius: '50%',
        background: SEVIYE_RENK[olay.seviye] || '#3b82f6', flexShrink: 0,
      }} />
      <span style={{ color: '#64748b', fontWeight: 600, minWidth: 58 }}>
        {zamanFormat(olay.olusturulma)}
      </span>
      <span style={{
        background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 4,
        fontSize: '0.62rem', fontWeight: 700, color: '#94a3b8', minWidth: 55, textAlign: 'center',
      }}>
        {olay.modul}
      </span>
      <span style={{ color: '#e2e8f0', fontWeight: 600, flex: 1 }}>{olay.olay_aciklama}</span>
      <span style={{ color: '#475569', fontSize: '0.62rem' }}>{olay.kullanici_adi}</span>
    </div>
  );
}

function CiftKontrolBar({ kontroller }: { kontroller: KontrolSayilari | null }) {
  const toplam = kontroller?.toplam || 0;
  if (toplam === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '1.2rem', color: '#64748b', fontSize: '0.82rem' }}>
        Henüz çift kontrol verisi yok
      </div>
    );
  }
  const onayYuzde = Math.round((kontroller!.onay / toplam) * 100);
  const redYuzde = Math.round((kontroller!.red / toplam) * 100);
  const bekliyorYuzde = 100 - onayYuzde - redYuzde;
  return (
    <div>
      <div style={{ display: 'flex', borderRadius: 10, overflow: 'hidden', height: 32 }}>
        {onayYuzde > 0 && (
          <div style={{ width: `${onayYuzde}%`, background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem', fontWeight: 800, color: 'white' }}>
            ✅ {kontroller!.onay}
          </div>
        )}
        {redYuzde > 0 && (
          <div style={{ width: `${redYuzde}%`, background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem', fontWeight: 800, color: 'white' }}>
            ❌ {kontroller!.red}
          </div>
        )}
        {bekliyorYuzde > 0 && (
          <div style={{ width: `${bekliyorYuzde}%`, background: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem', fontWeight: 800, color: 'white' }}>
            ⏳ {kontroller!.bekliyor}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: '0.68rem', color: '#64748b' }}>
        <span>Toplam: {toplam} kontrol</span>
        <span>Onay: %{onayYuzde} · Red: %{redYuzde}</span>
      </div>
    </div>
  );
}
