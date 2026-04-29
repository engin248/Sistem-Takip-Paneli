// ============================================================
// /api/kararlar — Kurul Karar Gecmisi
// ============================================================
// Gercek veri: Planlama_Departmani/kararlar/ dizininden JSON okur.
// Encoding duzeltildi: 2026-04-26 (Antigravity AI)
// Kok neden: UTF-8 double encoding — Turkce regex/string'ler bozuktu.
// ============================================================

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
          
          // Yeni 15-Algo Audit Izi (A15) loglarindan veya eski format loglardan veri ceker
          let onayOzet = '';
          if (icerik.islem_aciklamasi && icerik.kararlar) {
            // A15 Audit Formati
            const passlar = Object.values(icerik.kararlar).filter((k:any) => k.sonuc === 'PASS').length;
            const failler = Object.values(icerik.kararlar).filter((k:any) => k.sonuc === 'FAIL').length;
            const hermaiBaglam = icerik.hermai ? (icerik.hermai.celiski?.var ? 'CELISKI' : 'UYUM') : '';
            onayOzet = `[${passlar} PASS | ${failler} FAIL] ${hermaiBaglam} | ${icerik.islem_aciklamasi}`;
          } else {
            onayOzet = typeof icerik.nihai_onay === 'string' 
              ? icerik.nihai_onay.substring(0, 500) 
              : JSON.stringify(icerik.nihai_onay || '').substring(0, 500);
          }

          jsonKararlar.push({
            dosya,
            tip: 'KURUL_KARARI',
            tarih: icerik.tarih || icerik.zaman || dosya,
            gorev: icerik.gorev || icerik.gorev_id || '-',
            dugum: icerik.secilen_dugum || 'A14-FINAL',
            durum: icerik.durum || (icerik.kararlar?.a14?.sonuc) || 'BILINMIYOR',
            onay: onayOzet,
            asil_sayisi: Object.keys(icerik.asil_tezler || icerik.kararlar || {}).length,
            golge_sayisi: Object.keys(icerik.golge_itirazlari || {}).length,
          });
        } catch { /* bozuk dosya atla */ }
      });
    }

    // 2. ESKI LOG DOSYALARINDAN GOREV GECMISI
    const logKayitlari: any[] = [];
    const logDosyalari = ['ajanlar.log', 'ajan_ordusu.log'];
    
    logDosyalari.forEach(logFile => {
      const logPath = path.join(planlamaDir, logFile);
      if (fs.existsSync(logPath)) {
        const satirlar = fs.readFileSync(logPath, 'utf-8').split('\n');
        satirlar.forEach(satir => {
          // Gorev baslangiclarini yakala
          const fullMatch = satir.match(/\[([\d\-T:.Z]+)\].*\[FULL MODE\].*[Gg]orev.*[Bb]asladi.*"(.+?)"/i);
          const quickMatch = satir.match(/\[([\d\-T:.Z]+)\].*\[QUICK MODE\].*[Gg]orev.*"(.+?)"/i);
          const councilMatch = satir.match(/\[([\d\-T:.Z]+)\].*\[COUNCIL-15K\].*\[FULL MODE\].*[Gg]orev.*"(.+?)"/i);
          
          const match = councilMatch || fullMatch || quickMatch;
          if (match) {
            logKayitlari.push({
              dosya: logFile,
              tip: quickMatch ? 'HIZLI_GOREV' : 'KURUL_GOREVI',
              tarih: match[1],
              gorev: match[2],
              dugum: '-',
              durum: 'GECMIS',
              onay: `Kaynak: ${logFile}`,
              asil_sayisi: 0,
              golge_sayisi: 0,
            });
          }
        });
      }
    });

    // Duplicate'leri kaldir (ayni gorev ayni dakikada ise)
    const gorulenler = new Set<string>();
    const temizLoglar = logKayitlari.filter(k => {
      const anahtar = `${k.gorev}-${k.tarih?.substring(0, 16)}`;
      if (gorulenler.has(anahtar)) return false;
      gorulenler.add(anahtar);
      return true;
    });

    // Hepsini birlestir, en yeni once
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
