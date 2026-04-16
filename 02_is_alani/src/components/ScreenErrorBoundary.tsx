"use client";

import React from 'react';

// ============================================================
// ERROR BOUNDARY — UI Bileşen Çökmelerini Yakala
// Bir ekran patladığında panel tamamen boşalmaz.
// ============================================================

interface Props {
  children : React.ReactNode;
  fallback ?: React.ReactNode;
  screenId ?: string;
}

interface State {
  hasError  : boolean;
  errorMsg  : string;
  errorStack: string;
}

export class ScreenErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMsg: '', errorStack: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError  : true,
      errorMsg  : error.message,
      errorStack: error.stack?.slice(0, 600) ?? '',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Sessiz log — konsol kirlenmeyecek şekilde
    console.error(`[ScreenErrorBoundary] ${this.props.screenId ?? '?'}: ${error.message}`, info);
  }

  reset = () => this.setState({ hasError: false, errorMsg: '', errorStack: '' });

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    return (
      <div style={{
        padding: 20,
        border: '1px solid #7f1d1d',
        borderRadius: 8,
        background: '#0c0a0a',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        <div style={{ display:'flex', alignItems:'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>⚠</span>
          <div>
            <div style={{ color: '#f87171', fontSize: 11, fontWeight: 700, letterSpacing: '0.15em' }}>
              EKRAN HATASI — {this.props.screenId ?? 'BİLİNMEYEN'}
            </div>
            <div style={{ color: '#6b7280', fontSize: 9, fontFamily: 'monospace', marginTop: 2 }}>
              {this.state.errorMsg}
            </div>
          </div>
        </div>
        <pre style={{
          color: '#4b5563', fontSize: 8, fontFamily: 'monospace',
          whiteSpace: 'pre-wrap', lineHeight: 1.5,
          maxHeight: 120, overflowY: 'auto',
          background: '#020617', padding: 8, borderRadius: 4,
        }}>
          {this.state.errorStack}
        </pre>
        <button
          onClick={this.reset}
          style={{
            alignSelf: 'flex-start',
            background: '#1e293b', border: '1px solid #334155',
            color: '#94a3b8', fontSize: 9, fontWeight: 700,
            padding: '6px 14px', borderRadius: 6,
            cursor: 'pointer', fontFamily: 'monospace', letterSpacing: '0.1em',
          }}
        >
          ⟳ TEKRAR DENE
        </button>
      </div>
    );
  }
}

export default ScreenErrorBoundary;
