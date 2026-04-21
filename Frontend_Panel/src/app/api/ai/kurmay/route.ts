import { NextResponse } from 'next/server';
export async function POST() {
    return NextResponse.json({ success: true, message: "Islem dis kurmay servisine (Sistem Takip Paneli) devredildi." });
}
