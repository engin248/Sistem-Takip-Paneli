import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import LiveMetrics from './ui/LiveMetrics';

// Mock API Call (Bilesenin icindeki fetchWithTimeout icin global fetch'i taklit ediyoruz)
global.fetch = vi.fn((url: string) => {
  if (url === '/api/agents') {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ stats: { aktif: 58, toplamGorev: 10, toplamHata: 0 } })
    });
  }
  if (url === '/api/queue') {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ stats: { tamamlandi: 10, hata: 0, ort_sure_ms: 45 } })
    });
  }
  if (url === '/api/hat/data') {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ stats: null })
    });
  }
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({})
  });
}) as unknown as typeof fetch;

describe('LiveMetrics (Canlı Göstergeler) Panel Testi', () => {
  it('1. Bileşen sorunsuz render olmalı ve ana başlık var olmalıdır.', async () => {
    render(<LiveMetrics />);
    const baslik = await screen.findByText('CANLI GÖSTERGELER');
    expect(baslik).toBeInTheDocument();
  });

  it('2. Kapasite (Taşma/Limit) uyarısı onarılmış olmalı (Limit: 50 den 100 e çıkartılmış).', async () => {
    render(<LiveMetrics />);
    // " / 50" limiti artık UI'dan silinmiş olmalı
    const eskiLimit = screen.queryByText('/ 50');
    expect(eskiLimit).not.toBeInTheDocument();
    
    // Yeni limit " / 100" görünmeli
    await waitFor(() => {
      const yeniLimit = screen.getByText('/ 100');
      expect(yeniLimit).toBeInTheDocument();
    });
  });

  it('3. Otonom ajan verileri UI lara doğru yansıtılmalıdır.', async () => {
    render(<LiveMetrics />);
    await waitFor(() => {
      // Mock veride gönderdiğimiz '58' değerini bulabiliyor muyuz?
      const aktifAjanSayisi = screen.getByText('58');
      expect(aktifAjanSayisi).toBeInTheDocument();
    });
  });
});
