import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sistem Kontrol Merkezi',
  description: 'Tüm sistemleri izleyen, kontrol eden, denetleyen bağımsız komuta merkezi',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
