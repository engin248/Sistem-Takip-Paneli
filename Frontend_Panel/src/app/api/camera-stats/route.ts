import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
    try {
        // NİZAM: Workspace root dizinine çıkış yaparak Gözlem Departmanına erişiyoruz.
        const dbPath = path.resolve(process.cwd(), '../Kamera_Gozlem_Departmani/yerel_ai_sayimi.json');
        
        if (!fs.existsSync(dbPath)) {
            return NextResponse.json({ success: false, data: [] }, { status: 404 });
        }

        const raflar = fs.readFileSync(dbPath, 'utf-8');
        const islemKayitlari = JSON.parse(raflar || '[]');

        // Kameralara Göre İşlem Sayılarını Grupla ve Topla
        const kameraOzetleri: Record<string, number> = {};
        islemKayitlari.forEach((kayit: any) => {
            const camName = kayit.kamera;
            if(!kameraOzetleri[camName]) {
                kameraOzetleri[camName] = 0;
            }
            kameraOzetleri[camName] += (kayit.islem_adedi || 0);
        });

        return NextResponse.json({ success: true, data: kameraOzetleri });

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
