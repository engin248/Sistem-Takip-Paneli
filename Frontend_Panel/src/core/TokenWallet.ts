import * as fs from 'fs';
import * as path from 'path';

const WALLET_FILE = path.join(process.cwd(), '.agent_memory', 'token_wallet.json');
const DAILY_LIMIT = 500000; // Örn: Günlük 500.000 Token limiti

interface WalletState {
  date: string;
  tokens_used: number;
}

export class TokenWallet {
  /**
   * Cüzdandaki mevcut durumu okur. Eğer gün değişmişse sayacı sıfırlar.
   */
  static getWallet(): WalletState {
    const today = new Date().toISOString().split('T')[0] || new Date().toDateString();

    try {
      if (fs.existsSync(WALLET_FILE)) {
        const raw = fs.readFileSync(WALLET_FILE, 'utf-8');
        const state = JSON.parse(raw) as WalletState;
        
        if (state.date !== today) {
          return { date: today, tokens_used: 0 };
        }
        return state;
      }
    } catch {
      // Dosya hatası
    }
    
    return { date: today, tokens_used: 0 };
  }

  /**
   * Cüzdana harcanan token miktarını işler ve dosyaya kaydeder.
   */
  static addUsage(tokens: number): void {
    const state = this.getWallet();
    state.tokens_used += tokens;

    try {
      const dir = path.dirname(WALLET_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(WALLET_FILE, JSON.stringify(state), 'utf-8');
    } catch {
      // Vercel read-only koruması (Sessizce yut)
    }
  }

  /**
   * Sistemin günlük token limitini ulaşıp ulaşmadığını denetler.
   */
  static isBudgetDepleted(estimatedCost: number = 0): boolean {
    const state = this.getWallet();
    return (state.tokens_used + estimatedCost) > DAILY_LIMIT;
  }
  
  static getTokensUsed(): number {
    return this.getWallet().tokens_used;
  }
}
