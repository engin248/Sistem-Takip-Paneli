import * as fs from 'fs';
import * as path from 'path';

const MEMORY_DB_FILE = path.join(process.cwd(), '.agent_memory', 'knowledge_base.json');

export interface MemoryRecord {
  id: string;
  planId: string;
  timestamp: string;
  hedef: string;
  basarili_mi: boolean;
  temel_adimlar: string[];
  karsilasilan_anomali?: string;
  ekstra_notlar?: string;
}

export class VectorMemory {
  /**
   * Tüm bilgi tabanını getirir.
   */
  static getKnowledgeBase(): MemoryRecord[] {
    try {
      if (fs.existsSync(MEMORY_DB_FILE)) {
        const raw = fs.readFileSync(MEMORY_DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Okuma hatası
    }
    return [];
  }

  /**
   * Uzun vadeli hafızaya yeni bir tecrübe yazar.
   */
  static writeMemory(record: Omit<MemoryRecord, 'id' | 'timestamp'>): void {
    const memory = this.getKnowledgeBase();
    
    memory.push({
      id: `MEM-${Date.now()}-${Math.random().toString(36).substring(2,6).toUpperCase()}`,
      timestamp: new Date().toISOString(),
      ...record
    });

    try {
      const dir = path.dirname(MEMORY_DB_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(MEMORY_DB_FILE, JSON.stringify(memory, null, 2), 'utf-8');
    } catch {
      // Vercel / Cloud Read-Only hatası yutulur
    }
  }

  /**
   * İlerideki görevler için geçmiş hafızayı tarar. (Metin eşleşmesi - Sözde Vektör)
   */
  static findSimilar(query: string): MemoryRecord[] {
    const memory = this.getKnowledgeBase();
    if (!query) return [];
    
    const keywords = query.toLowerCase().split(' ').filter(k => k.length > 4);
    
    // Geçmişteki görevlerin amaç ve olaylarında basit filtreleme
    const results = memory.filter(m => {
      const text = `${m.hedef} ${m.karsilasilan_anomali} ${m.temel_adimlar.join(' ')}`.toLowerCase();
      return keywords.some(k => text.includes(k));
    });

    return results.slice(-5); // En alakalı/yakın tarihli 5 taneyi dön
  }
}
