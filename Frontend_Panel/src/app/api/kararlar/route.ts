import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const planlamaDir = path.join(process.cwd(), '..', 'Planlama_Departmani');
    const kararlarDir = path.join(planlamaDir, 'kararlar');
    
    // 1. JSON KARARLAR (yeni sistem)
    const jsonKararlar: any[] = [];
    if (fs.existsSync(kararlarDir)) {
      const dosyalar = fs.readdirSync(kararlarDir)
        .filter(f => f.endsWith('.json'))
        .sort((a, b) => b.localeCompare(a));

      dosyalar.slice(0, 50).forEach(dosya => {
        try {
          const icerik = JSON.parse(fs.readFileSync(path.join(kararlarDir, dosya), 'utf-8'));
          jsonKararlar.push({
            dosya,
            tip: 'KURUL_KARARI',
            tarih: icerik.tarih || dosya,
            gorev: icerik.gorev || '—',
            dugum: icerik.secilen_dugum || '—',
            durum: icerik.durum || 'BİLİNMİYOR',
            muhur: typeof icerik.nihai_muhur === 'string' 
              ? icerik.nihai_muhur.substring(0, 500) 
              : JSON.stringify(icerik.nihai_muhur || '').substring(0, 500),
            asil_sayisi: Object.keys(icerik.asil_tezler || {}).length,
            golge_sayisi: Object.keys(icerik.golge_itirazlari || {}).length,
          });
        } catch { /* bozuk dosya atla */ }
      });
    }

    // 2. ESKİ LOG DOSYALARINDAN GÖREV GEÇMİŞİ
    const logKayitlari: any[] = [];
    const logDosyalari = ['ajanlar.log', 'ajan_ordusu.log'];
    
    logDosyalari.forEach(logFile => {
      const logPath = path.join(planlamaDir, logFile);
      if (fs.existsSync(logPath)) {
        const satirlar = fs.readFileSync(logPath, 'utf-8').split('\n');
        satirlar.forEach(satir => {
          // Görev başlangıçlarını yakala
          const fullMatch = satir.match(/\[([\d\-T:.Z]+)\].*\[FULL MODE\] Görev Başladı: "(.+?)"/);
          const quickMatch = satir.match(/\[([\d\-T:.Z]+)\].*\[QUICK MODE\] (?:Hızlı Görev|Görev): "(.+?)"/);
          const councilMatch = satir.match(/\[([\d\-T:.Z]+)\].*\[COUNCIL-15K\] \[FULL MODE\] Görev Başladı: "(.+?)"/);
          
          const match = councilMatch || fullMatch || quickMatch;
          if (match) {
            logKayitlari.push({
              dosya: logFile,
              tip: quickMatch ? 'HIZLI_GÖREV' : 'KURUL_GÖREVİ',
              tarih: match[1],
              gorev: match[2],
              dugum: '—',
              durum: 'GEÇMİŞ',
              muhur: `Kaynak: ${logFile}`,
              asil_sayisi: 0,
              golge_sayisi: 0,
            });
          }
        });
      }
    });

    // Duplicate'leri kaldır (aynı görev aynı dakikada ise)
    const gorulenler = new Set<string>();
    const temizLoglar = logKayitlari.filter(k => {
      const anahtar = `${k.gorev}-${k.tarih?.substring(0, 16)}`;
      if (gorulenler.has(anahtar)) return false;
      gorulenler.add(anahtar);
      return true;
    });

    // Hepsini birleştir, en yeni önce
    const tumKararlar = [...jsonKararlar, ...temizLoglar].sort((a, b) => {
      const ta = new Date(a.tarih || 0).getTime();
      const tb = new Date(b.tarih || 0).getTime();
      return tb - ta;
    });

    return NextResponse.json({ kararlar: tumKararlar });
  } catch (err: any) {
    return NextResponse.json({ kararlar: [], hata: err.message });
  }
}
