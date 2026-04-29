import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Local path relative to the process
    // On local dev, this works. On Vercel, this is a placeholder.
    const statusPath = path.join(process.cwd(), '../WhatsApp_Bot/whatsapp_status.json');
    const logPath = path.join(process.cwd(), '../WhatsApp_Bot/whatsapp_agent.log');

    let status = { status: 'OFFLINE', message: 'Bot başlatılmadı' };
    let logs = '';

    if (fs.existsSync(statusPath)) {
      status = JSON.parse(fs.readFileSync(statusPath, 'utf-8'));
    }

    if (fs.existsSync(logPath)) {
      // Son 50 satırı oku
      const allLogs = fs.readFileSync(logPath, 'utf-8').split('\n');
      logs = allLogs.slice(-50).join('\n');
    }

    return NextResponse.json({
      success: true,
      data: status,
      logs: logs
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
