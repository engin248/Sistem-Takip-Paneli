// src/core/toolRunner.ts
// ============================================================
// TOOL RUNNER — AJAN ARAÇ KUTUSU
// ============================================================
// Ajanların gerçekten iş yapabilmesi için 6 araç:
//   1. dosyaOku     → Dosya içeriği oku
//   2. dosyaYaz     → Dosya oluştur / güncelle
//   3. dizinListele → Klasör içeriğini listele
//   4. webAra       → DuckDuckGo ile web araması
//   5. ragSorgula   → KONSOLIDE_ARSIV'de bilgi ara
//   6. apiCagir     → Harici HTTP isteği gönder
// ============================================================

import fs   from 'fs';
import path from 'path';
import { ragSorgula } from '@/services/ragService';
import { webSearch  } from '@/services/webSearch';

// ── TİPLER ───────────────────────────────────────────────────
export type ToolAdi =
  | 'dosyaOku'
  | 'dosyaYaz'
  | 'dizinListele'
  | 'webAra'
  | 'ragSorgula'
  | 'apiCagir';

export interface ToolGirdi {
  arac  : ToolAdi;
  params: Record<string, unknown>;
}

export interface ToolSonuc {
  basari  : boolean;
  arac    : ToolAdi;
  cikti   : unknown;
  hata   ?: string;
  sure_ms : number;
}

// ── GÜVENLİK: İzin verilen yollar ────────────────────────────
// Env var ile konfigüre edilebilir: TOOL_ALLOWED_DIRS=C:\path1;C:\path2
const DEFAULT_DIRS = [
  'C:\\Users\\Esisya\\Desktop\\',
  'C:\\Users\\Esisya\\Desktop\\Sistem-Takip-Paneli\\',
  'C:\\Users\\Esisya\\Desktop\\KONSOLIDE_ARSIV\\',
  'C:\\agent_audit\\',
];

const IZINLI_DIZINLER = process.env.TOOL_ALLOWED_DIRS
  ? process.env.TOOL_ALLOWED_DIRS.split(';').filter(d => d.trim().length > 0)
  : DEFAULT_DIRS;

const YASAK_UZANTILAR = ['.exe', '.bat', '.cmd', '.ps1', '.sh'];
const MAX_DOSYA_KB    = 500;

function yolGuvenliMi(dosyaYolu: string): boolean {
  const normal = path.normalize(dosyaYolu);
  return IZINLI_DIZINLER.some(d => normal.startsWith(path.normalize(d)));
}

// ── 1. DOSYA OKU ─────────────────────────────────────────────
async function dosyaOku(params: { yol: string; max_satir?: number }): Promise<unknown> {
  const { yol, max_satir = 200 } = params;

  if (!yol) throw new Error('yol parametresi gerekli');
  if (!yolGuvenliMi(yol)) throw new Error(`Erişim reddedildi: ${yol}`);

  const stat = fs.statSync(yol);
  if (stat.size > MAX_DOSYA_KB * 1024) throw new Error(`Dosya çok büyük: ${Math.round(stat.size/1024)}KB`);

  const icerik = fs.readFileSync(yol, 'utf-8');
  const satirlar = icerik.split('\n');
  const kesik    = satirlar.slice(0, max_satir);

  return {
    yol,
    toplam_satir: satirlar.length,
    gosterilen  : kesik.length,
    icerik      : kesik.join('\n'),
    boyut_kb    : Math.round(stat.size / 1024),
  };
}

// ── 2. DOSYA YAZ ─────────────────────────────────────────────
async function dosyaYaz(params: { yol: string; icerik: string; mod?: 'yaz' | 'ekle' }): Promise<unknown> {
  const { yol, icerik, mod = 'yaz' } = params;

  if (!yol) throw new Error('yol parametresi gerekli');
  if (!icerik && icerik !== '') throw new Error('icerik parametresi gerekli');
  if (!yolGuvenliMi(yol)) throw new Error(`Erişim reddedildi: ${yol}`);

  const uzanti = path.extname(yol).toLowerCase();
  if (YASAK_UZANTILAR.includes(uzanti)) throw new Error(`Yasak uzantı: ${uzanti}`);

  const dizin = path.dirname(yol);
  if (!fs.existsSync(dizin)) fs.mkdirSync(dizin, { recursive: true });

  if (mod === 'ekle') {
    fs.appendFileSync(yol, icerik, 'utf-8');
  } else {
    fs.writeFileSync(yol, icerik, 'utf-8');
  }

  const stat = fs.statSync(yol);
  return {
    yol,
    mod,
    boyut_kb: Math.round(stat.size / 1024),
    basarili: true,
  };
}

// ── 3. DİZİN LİSTELE ─────────────────────────────────────────
async function dizinListele(params: { yol: string; derinlik?: number }): Promise<unknown> {
  const { yol, derinlik = 1 } = params;

  if (!yol) throw new Error('yol parametresi gerekli');
  if (!yolGuvenliMi(yol)) throw new Error(`Erişim reddedildi: ${yol}`);

  function listele(dir: string, seviye: number): unknown[] {
    if (seviye > derinlik) return [];
    const icerik = fs.readdirSync(dir, { withFileTypes: true });
    return icerik.map(e => ({
      ad     : e.name,
      tip    : e.isDirectory() ? 'klasor' : 'dosya',
      yol    : path.join(dir, e.name),
      ...(e.isFile() ? { boyut_kb: Math.round(fs.statSync(path.join(dir, e.name)).size / 1024) } : {}),
      ...(e.isDirectory() && seviye < derinlik ? { icerik: listele(path.join(dir, e.name), seviye + 1) } : {}),
    }));
  }

  return { yol, derinlik, icerik: listele(yol, 0) };
}

// ── 4. WEB ARA ────────────────────────────────────────────────
async function webAra(params: { sorgu: string; max?: number }): Promise<unknown> {
  const { sorgu, max = 5 } = params;
  if (!sorgu) throw new Error('sorgu parametresi gerekli');
  return await webSearch(sorgu, max);
}

// ── 5. RAG SORGULA ───────────────────────────────────────────
async function ragSorgulaArac(params: { sorgu: string; max?: number }): Promise<unknown> {
  const { sorgu, max = 3 } = params;
  if (!sorgu) throw new Error('sorgu parametresi gerekli');
  return ragSorgula(sorgu, max);
}

// ── 6. API ÇAĞIR ─────────────────────────────────────────────
async function apiCagir(params: {
  url    : string;
  metod ?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  govde ?: Record<string, unknown>;
  basliklar?: Record<string, string>;
}): Promise<unknown> {
  const { url, metod = 'GET', govde, basliklar = {} } = params;

  if (!url) throw new Error('url parametresi gerekli');

  const res = await fetch(url, {
    method : metod,
    headers: { 'Content-Type': 'application/json', ...basliklar },
    body   : govde ? JSON.stringify(govde) : undefined,
  });

  const metin = await res.text();
  let veri: unknown = metin;
  try { veri = JSON.parse(metin); } catch { /* düz metin döner */ }

  return {
    url,
    durum_kodu: res.status,
    durum_metni: res.statusText,
    basarili   : res.ok,
    yanit      : veri,
  };
}

// ── ANA ÇALIŞTIRICI ───────────────────────────────────────────
export async function toolCalistir(girdi: ToolGirdi): Promise<ToolSonuc> {
  const baslangic = Date.now();

  try {
    let cikti: unknown;

    switch (girdi.arac) {
      case 'dosyaOku':
        cikti = await dosyaOku(girdi.params as { yol: string; max_satir?: number });
        break;
      case 'dosyaYaz':
        cikti = await dosyaYaz(girdi.params as { yol: string; icerik: string; mod?: 'yaz' | 'ekle' });
        break;
      case 'dizinListele':
        cikti = await dizinListele(girdi.params as { yol: string; derinlik?: number });
        break;
      case 'webAra':
        cikti = await webAra(girdi.params as { sorgu: string; max?: number });
        break;
      case 'ragSorgula':
        cikti = await ragSorgulaArac(girdi.params as { sorgu: string; max?: number });
        break;
      case 'apiCagir':
        cikti = await apiCagir(girdi.params as Parameters<typeof apiCagir>[0]);
        break;
      default:
        throw new Error(`Bilinmeyen araç: ${(girdi as { arac: string }).arac}`);
    }

    return {
      basari : true,
      arac   : girdi.arac,
      cikti,
      sure_ms: Date.now() - baslangic,
    };

  } catch (err) {
    return {
      basari : false,
      arac   : girdi.arac,
      cikti  : null,
      hata   : err instanceof Error ? err.message : String(err),
      sure_ms: Date.now() - baslangic,
    };
  }
}

// ── ARAÇ API ŞEMASI (Panelde gösterim için) ──────────────────
export const ARAC_SEMA = {
  dosyaOku    : { params: ['yol: string', 'max_satir?: number (default 200)'], aciklama: 'Dosya içeriğini okur' },
  dosyaYaz    : { params: ['yol: string', 'icerik: string', "mod?: 'yaz'|'ekle'"], aciklama: 'Dosya oluşturur veya günceller' },
  dizinListele: { params: ['yol: string', 'derinlik?: number (default 1)'], aciklama: 'Klasör içeriğini listeler' },
  webAra      : { params: ['sorgu: string', 'max?: number (default 5)'], aciklama: 'DuckDuckGo ile web araması' },
  ragSorgula  : { params: ['sorgu: string', 'max?: number (default 3)'], aciklama: 'KONSOLIDE_ARSIV bilgi tabanında arar' },
  apiCagir    : { params: ['url: string', "metod?: GET|POST|PUT|DELETE", 'govde?: object', 'basliklar?: object'], aciklama: 'HTTP isteği gönderir' },
};
