import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateStrategicPlan } from './kurmayService';
import { orchestrateTask } from './orchestrationService';
import * as aiProvider from '@/lib/aiProvider';
import { supabase } from '@/lib/supabase';
import * as hatBridge from './hatBridge';

// AI ve DB Bağımlılıklarını Mockla
vi.mock('@/lib/aiProvider', () => ({
  aiComplete: vi.fn()
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'test-id' }, error: null }))
        }))
      }))
    }))
  }
}));

vi.mock('./hatBridge', () => ({
  pushToRedLine: vi.fn(() => ({ success: true, hat_id: 'HAT-123' }))
}));

vi.mock('./aiManager', () => ({
  analyzeTaskPriority: vi.fn(() => Promise.resolve({
    priority: 'normal',
    reasoning: 'Test Gerekçe'
  }))
}));

describe('Otonom Bağlantı Doğrulama (Audit)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Kurmay Servisi', () => {
    it('AI başarılı yanit dönerse plan taslağı üretir', async () => {
      (aiProvider.aiComplete as any).mockResolvedValue({
        content: JSON.stringify({
          ai_plans: [{ title: 'Test Görev', description: 'Test Açıklama', priority: 'normal' }],
          reasoning: 'Test Gerekçe'
        }),
        provider: 'mock'
      });

      const result = await generateStrategicPlan('Test Hedef');
      expect(result.success).toBe(true);
      expect(result.ai_plans.length).toBe(1);
      expect(result.ai_plans[0].title).toBe('Test Görev');
    });

    it('AI hatası durumunda zarif bir şekilde başarısız olur (Graceful Degradation)', async () => {
      (aiProvider.aiComplete as any).mockRejectedValue(new Error('AI Hatası'));
      const result = await generateStrategicPlan('Test Hedef');
      expect(result.success).toBe(false);
      expect(result.ai_plans).toEqual([]);
    });
  });

  describe('Orkestrasyon Servisi', () => {
    it('Görev geldiğinde DB ve RedLine işlemlerini doğru yürütür', async () => {
        // analyzeTaskPriority mock'lamaya gerek yok, aiComplete mock'lu olduğu için içinden geçer.
        (aiProvider.aiComplete as any).mockResolvedValue({
            content: '{"priority": "yuksek", "reasoning": "Acil durum"}',
            provider: 'mock'
        });

        const result = await orchestrateTask({ gorev: 'Veritabanını yedekle', ajan_id: 'A-01' });
        
        expect(result.success).toBe(true);
        // Supabase artık kullanılmıyor, lokal icra hattına fırlatma kontrol edilir.
        expect(hatBridge.pushToRedLine).toHaveBeenCalled();
    });
  });
});
