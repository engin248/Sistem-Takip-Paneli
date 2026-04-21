/**
 * SÝSTEM TAKÝP PANELÝ - FSM (Sonlu Durum Makinesi) KORUYUCUSU
 * Durum geçiþlerini matematiksel bir Fizik Yasasýna baðlar. Birimlerin 
 * kendi hatalý yorumlarýyla durumu yanlýþlýkla bozmasýný engeller.
 */
export class StateMachineGuard {
  // Sadece bu anahtarlar ve diziler arasýnda geçiþ yapýlabilir. Diðerleri yasaktýr.
  private static readonly ALLOWED_TRANSITIONS: Record<string, string[]> = {
    'onay_bekliyor': ['beklemede', 'iptal'],           // G-0 Onayýndan sonra gideceði yer
    'beklemede': ['islemde', 'iptal'],                 // Sýradaki veya Reddedilen
    'islemde': ['tamamlandi', 'iptal', 'beklemede'],   // Beklemeye geri atýlabilir (Rollback)
    'tamamlandi': ['muhurlendi'],                      // Sadece son iþlem (Audit geçti ise)
    'muhurlendi': [],                                  // Ölümcül son. Geri dönüÞ yoktur.
    'iptal': ['beklemede']                             // Sadece onayla geri çekilebilir.
  };

  /**
   * Bir statü geçiþinin meþru (Deterministik) olup olmadýðýný SÝSTEM TAKÝP PANELÝ yasalarýnca doðrular.
   * @param currentStatus Mevcut Statü
   * @param nextStatus Gitmek Ýstenen Statü
   * @returns Ýzin varsa TRUE
   */
  public static validateTransition(currentStatus: string, nextStatus: string): boolean {
    if (currentStatus === nextStatus) return true; // Ayný statü, güncelleme (deðiþiklik) sayýlmaz.
    
    const allowed = this.ALLOWED_TRANSITIONS[currentStatus];
    if (!allowed) {
      console.error(`[FSM KÝLÝDÝ] Tanýmsýz VEYA Yasaklý baþlangýç durumu: ${currentStatus}`);
      return false; 
    }
    
    if (!allowed.includes(nextStatus)) {
      console.error(`[FSM KÝLÝDÝ] Determinizm Ýhlali! '${currentStatus}' statüsünden '${nextStatus}' statüsüne geçiþ FÝZÝÄžE AYKIRIDIR.`);
      return false;
    }

    return true; // Geçiþ Meþru.
  }
}

