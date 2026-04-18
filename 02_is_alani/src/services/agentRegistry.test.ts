import { describe, it, expect, vi, beforeEach } from 'vitest';
import { agentRegistry, type AgentCard } from './agentRegistry';

// ============================================================
// Agent Registry â€” 50 KiÅŸilik Hibrit Kadro Unit Testleri
// Sorgulama, kayÄ±t, gÃ¼ncelleme, istatistik
// ============================================================

describe('AgentRegistry', () => {
  // â”€â”€ BAÅLANGIÃ‡ KADROSU â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  describe('baÅŸlangÄ±Ã§ kadrosu', () => {
    it('58 kişilik kadro yüklü', () => {
      const all = agentRegistry.getAll();
      expect(all.length).toBe(58);
    });

    it('4 komuta kartÄ± var', () => {
      const komuta = agentRegistry.getByKatman('KOMUTA');
      expect(komuta.length).toBe(4);
    });

    it('KOMUTAN K-1 ID ile bulunabilir', () => {
      const komutan = agentRegistry.getById('K-1');
      expect(komutan).toBeDefined();
      expect(komutan!.kod_adi).toBe('KOMUTAN');
    });

    it('L2 denetci B-01 ID ile bulunabilir', () => {
      const denetci = agentRegistry.getById('B-01');
      expect(denetci!.katman).toBe('L2');
    });
  });

  // â”€â”€ SORGULAMA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  describe('sorgulama', () => {
    it('katmana göre filtreler — L1 = 14 ajan', () => {
      expect(agentRegistry.getByKatman('L1').length).toBe(14);
    });

    it('katmana göre filtreler — L2 = 10 ajan', () => {
      expect(agentRegistry.getByKatman('L2').length).toBe(10);
    });

    it('katmana göre filtreler — L3 = 2 ajan', () => {
      expect(agentRegistry.getByKatman('L3').length).toBe(2);
    });

    it('katmana göre filtreler — DESTEK = 28 ajan', () => {
      expect(agentRegistry.getByKatman('DESTEK').length).toBe(28);
    });

    it('duruma göre filtreler — 58 aktif (tam kadro)', () => {
      const aktif = agentRegistry.getByDurum('aktif');
      expect(aktif.length).toBe(58);
    });

    it('duruma göre filtreler — 0 pasif (tam kadro aktif)', () => {
      const pasif = agentRegistry.getByDurum('pasif');
      expect(pasif.length).toBe(0);
    });

    it('beceriye gÃ¶re arar â€” react bulunur (durum filtresi yok)', () => {
      // getByBeceri durum filtresi YAPMAZ â€” pasif ajanlarÄ± da dÃ¶ndÃ¼rÃ¼r
      const react = agentRegistry.getByBeceri('react');
      expect(react.length).toBeGreaterThan(0);
      // Ä°CRACI-FE pasif ama getByBeceri listede gÃ¶sterir
      expect(react.some(a => a.id === 'A-01')).toBe(true);
    });

    it('gÃ¶rev yapabilecek ajanlarÄ± bulur â€” karar_verme (KOMUTA)', () => {
      // findCapableAgents yalnÄ±zca aktif ajanlarÄ± dÃ¶ndÃ¼rÃ¼r
      // KOMUTA ajanÄ± aktif ve karar_verme becerisine sahip
      const capable = agentRegistry.findCapableAgents('karar_verme');
      expect(capable.some(a => a.kod_adi === 'KOMUTAN')).toBe(true);
    });

    it('olmayan ID undefined dÃ¶ner', () => {
      expect(agentRegistry.getById('X-99')).toBeUndefined();
    });
  });

  // â”€â”€ KAYIT VE GÃœNCELLEME â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  describe('kayÄ±t ve gÃ¼ncelleme', () => {
    it('yeni ajan kaydÄ± yapÄ±labilir', () => {
      const yeniAjan: AgentCard = {
        id: 'TEST-01',
        kod_adi: 'TEST-AJAN',
        rol: 'Test amaÃ§lÄ± ajan',
        katman: 'DESTEK',
        beceri_listesi: ['test'],
        kapsam_siniri: [],
        ogrenme_kapasitesi: true,
        bagimliliklari: [],
        durum: 'aktif',
        tamamlanan_gorev: 0,
        hata_sayisi: 0,
        son_aktif: new Date().toISOString(),
        olusturulma: new Date().toISOString(),
      };
      const result = agentRegistry.register(yeniAjan);
      expect(result.success).toBe(true);
      expect(agentRegistry.getById('TEST-01')).toBeDefined();

      // Temizlik
      agentRegistry.remove('TEST-01');
    });

    it('aynÄ± ID ile kayÄ±t baÅŸarÄ±sÄ±z', () => {
      const result = agentRegistry.register({ id: 'K-1' } as AgentCard);
      expect(result.success).toBe(false);
      expect(result.error).toContain('zaten mevcut');
    });

    it('durum gÃ¼ncelleme Ã§alÄ±ÅŸÄ±r', () => {
      const updated = agentRegistry.updateDurum('A-01', 'bakimda');
      expect(updated).toBe(true);
      expect(agentRegistry.getById('A-01')!.durum).toBe('bakimda');

      // Geri al
      agentRegistry.updateDurum('A-01', 'aktif');
    });

    it('gÃ¶rev tamamlama sayacÄ± Ã§alÄ±ÅŸÄ±r', () => {
      const agent = agentRegistry.getById('A-01')!;
      const onceki = agent.tamamlanan_gorev;
      agentRegistry.recordGorevTamamlama('A-01', true);
      expect(agentRegistry.getById('A-01')!.tamamlanan_gorev).toBe(onceki + 1);
    });

    it('Ã¶ÄŸrenme kapasitesi olan ajana beceri eklenebilir', () => {
      const result = agentRegistry.addBeceri('A-01', ['yeni_beceri_test']);
      expect(result).toBe(true);
      expect(agentRegistry.getById('A-01')!.beceri_listesi).toContain('yeni_beceri_test');
    });
  });

  // â”€â”€ Ä°STATÄ°STÄ°K â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  describe('istatistik', () => {
    it('stats doğru hesaplanır', () => {
      const stats = agentRegistry.getStats();
      expect(stats.toplam).toBe(58);
      expect(stats.komuta).toBe(4);
      expect(stats.katmanDagilimi.L1).toBe(14);
      expect(stats.katmanDagilimi.L2).toBe(10);
      expect(stats.katmanDagilimi.L3).toBe(2);
      expect(stats.katmanDagilimi.DESTEK).toBe(28);
    });

    it('sonraki ajan ID Ã¼retilir', () => {
      const nextId = agentRegistry.getNextAgentId();
      expect(nextId).toMatch(/^A-\d{2}$/);
    });
  });
});
