/**
 * SÄ°STEM TAKÄ°P PANELÄ° - FSM (Sonlu Durum Makinesi) KORUYUCUSU
 * Durum geÃ§iÅŸlerini matematiksel bir Fizik YasasÄ±na baÄŸlar. Birimlerin 
 * kendi hatalÄ± yorumlarÄ±yla durumu yanlÄ±ÅŸlÄ±kla bozmasÄ±nÄ± engeller.
 */
export class StateMachineGuard {
  // Sadece bu anahtarlar ve diziler arasÄ±nda geÃ§iÅŸ yapÄ±labilir. DiÄŸerleri yasaktÄ±r.
  private static readonly ALLOWED_TRANSITIONS: Record<string, string[]> = {
    'onay_bekliyor': ['beklemede', 'iptal'],           // G-0 OnayÄ±ndan sonra gideceÄŸi yer
    'beklemede': ['islemde', 'iptal'],                 // SÄ±radaki veya Reddedilen
    'islemde': ['tamamlandi', 'iptal', 'beklemede'],   // Beklemeye geri atÄ±labilir (Rollback)
    'tamamlandi': ['muhurlendi'],                      // Sadece son iÅŸlem (Audit geÃ§ti ise)
    'muhurlendi': [],                                  // Ã–lÃ¼mcÃ¼l son. Geri dÃ¶nÃ¼ÅŸ yoktur.
    'iptal': ['beklemede']                             // Sadece onayla geri Ã§ekilebilir.
  };

  /**
   * Bir statÃ¼ geÃ§iÅŸinin meÅŸru (Deterministik) olup olmadÄ±ÄŸÄ±nÄ± SİSTEM TAKİP PANELİ yasalarÄ±nca doÄŸrular.
   * @param currentStatus Mevcut StatÃ¼
   * @param nextStatus Gitmek Ä°stenen StatÃ¼
   * @returns Ä°zin varsa TRUE
   */
  public static validateTransition(currentStatus: string, nextStatus: string): boolean {
    if (currentStatus === nextStatus) return true; // AynÄ± statÃ¼, gÃ¼ncelleme (deÄŸiÅŸiklik) sayÄ±lmaz.
    
    const allowed = this.ALLOWED_TRANSITIONS[currentStatus];
    if (!allowed) {
      console.error(`[FSM KÄ°LÄ°DÄ°] TanÄ±msÄ±z VEYA YasaklÄ± baÅŸlangÄ±Ã§ durumu: ${currentStatus}`);
      return false; 
    }
    
    if (!allowed.includes(nextStatus)) {
      console.error(`[FSM KÄ°LÄ°DÄ°] Determinizm Ä°hlali! '${currentStatus}' statÃ¼sÃ¼nden '${nextStatus}' statÃ¼sÃ¼ne geÃ§iÅŸ FÄ°ZÄ°ÄE AYKIRIDIR.`);
      return false;
    }

    return true; // GeÃ§iÅŸ MeÅŸru.
  }
}

