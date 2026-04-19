// /api/hat/durum — Komut Zinciri durum raporu
import { NextResponse } from 'next/server';
import { zincirDurumRaporu } from '@/services/komutZinciriService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rapor = zincirDurumRaporu();
    return NextResponse.json({ success: true, ...rapor });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
