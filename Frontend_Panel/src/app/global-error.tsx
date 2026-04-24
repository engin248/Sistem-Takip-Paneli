"use client";

// src/app/global-error.tsx
// Root-level hata yakalayıcı — tüm panelin çöküşünü önler
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="tr">
      <body style={{
        margin: 0, minHeight: '100vh', background: '#020817',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'monospace',
      }}>
        <div style={{
          maxWidth: 480, width: '90%', padding: '40px',
          background: '#0f172a', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 16, textAlign: 'center',
        }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
          <h1 style={{
            color: '#f87171', fontSize: 11, letterSpacing: '0.25em',
            textTransform: 'uppercase', fontWeight: 900, marginBottom: 8,
          }}>
            SİSTEM HATASI
          </h1>
          <p style={{ color: '#64748b', fontSize: 10, marginBottom: 24 }}>
            {error.message ?? 'Beklenmeyen bir hata oluştu.'}
          </p>
          {error.digest && (
            <p style={{ color: '#334155', fontSize: 9, marginBottom: 24, fontFamily: 'monospace' }}>
              DIGEST: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.3)',
              color: '#06b6d4', fontSize: 10, fontWeight: 700,
              padding: '10px 24px', borderRadius: 8, cursor: 'pointer',
              letterSpacing: '0.15em', textTransform: 'uppercase',
            }}
          >
            ↺ YENİDEN DENE
          </button>
        </div>
      </body>
    </html>
  );
}

