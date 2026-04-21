import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  checkOllamaHealth,
  resetOllamaHealthCache,
  getProviderStatus,
  type AIProviderConfig,
} from './aiProvider';

// ============================================================
// AI Provider — Fallback Zinciri Unit Testleri
// Ollama → OpenAI → Lokal kurallar
// ============================================================

// Global fetch mock
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('AI Provider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetOllamaHealthCache();
    // Env temizle
    vi.stubEnv('FORCE_DISABLE_OLLAMA', '');
    vi.stubEnv('FORCE_DISABLE_OPENAI', '');
    vi.stubEnv('OPENAI_API_KEY', '');
    vi.stubEnv('OLLAMA_BASE_URL', 'http://localhost:11434');
  });

  // ── OLLAMA HEALTH CHECK ───────────────────────────────────
  describe('checkOllamaHealth', () => {
    it('Ollama çalışıyorsa true döner', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });
      const result = await checkOllamaHealth();
      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/tags',
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('Ollama çalışmıyorsa false döner', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));
      const result = await checkOllamaHealth();
      expect(result).toBe(false);
    });

    it('HTTP hata kodu döndürürse false döner', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
      const result = await checkOllamaHealth();
      expect(result).toBe(false);
    });

    it('cache 30 saniye boyunca korunur', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });
      await checkOllamaHealth();
      await checkOllamaHealth(); // İkinci çağrı cache'ten gelir
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('cache sıfırlandıktan sonra yeniden kontrol eder', async () => {
      mockFetch.mockResolvedValue({ ok: true });
      await checkOllamaHealth();
      resetOllamaHealthCache();
      await checkOllamaHealth();
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  // ── PROVIDER STATUS ───────────────────────────────────────
  describe('getProviderStatus', () => {
    it('Ollama aktifken provider=ollama döner', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });
      const status = await getProviderStatus();
      expect(status.activeProvider).toBe('ollama');
      expect(status.coSistem Takip PanelierRequest).toContain('0₺');
    });

    it('Ollama kapalı + OpenAI key yoksa provider=local döner', async () => {
      vi.stubEnv('FORCE_DISABLE_OLLAMA', 'true');
      vi.stubEnv('FORCE_DISABLE_OPENAI', 'true');
      const status = await getProviderStatus();
      expect(status.activeProvider).toBe('local');
      expect(status.coSistem Takip PanelierRequest).toContain('Lokal');
    });

    it('Ollama kapalı + OpenAI key varsa bile provider=local döner (OpenAI devre dışı)', async () => {
      vi.stubEnv('FORCE_DISABLE_OLLAMA', 'true');
      vi.stubEnv('OPENAI_API_KEY', 'sk-test-key-123');
      const status = await getProviderStatus();
      // OpenAI tüm sistemde devre dışı — her zaman local'a düşer
      expect(status.activeProvider).toBe('local');
      expect(status.coSistem Takip PanelierRequest).toContain('Lokal');
    });
  });
});
