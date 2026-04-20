/**
 * SİSTEM TAKİP PANELİ - FSM (Sonlu Durum Makinesi) KORUYUCUSU
 * Durum geçişlerini matematiksel bir Fizik Yasasına bağlar. Birimlerin 
 * kendi hatalı yorumlarıyla durumu yanlışlıkla bozmasını engeller.
 */
export class StateMachineGuard {
  // Sadece bu anahtarlar ve diziler arasında geçiş yapılabilir. Diğerleri yasaktır.
  private static readonly ALLOWED_TRANSITIONS: Record<string, string[]> = {
    'onay_bekliyor': ['beklemede', 'iptal'],           // G-0 Onayından sonra gideceği yer
    'beklemede': ['islemde', 'iptal'],                 // Sıradaki veya Reddedilen
    'islemde': ['tamamlandi', 'iptal', 'beklemede'],   // Beklemeye geri atılabilir (Rollback)
    'tamamlandi': ['muhurlendi'],                      // Sadece son işlem (Audit geçti ise)
    'muhurlendi': [],                                  // Ölümcül son. Geri dönüŞ yoktur.
    'iptal': ['beklemede']                             // Sadece onayla geri çekilebilir.
  };

  /**
   * Bir statü geçişinin meşru (Deterministik) olup olmadığını SİSTEM TAKİP PANELİ yasalarınca doğrular.
   * @param currentStatus Mevcut Statü
   * @param nextStatus Gitmek İstenen Statü
   * @returns İzin varsa TRUE
   */
  public static validateTransition(currentStatus: string, nextStatus: string): boolean {
    if (currentStatus === nextStatus) return true; // Aynı statü, güncelleme (değişiklik) sayılmaz.
    
    const allowed = this.ALLOWED_TRANSITIONS[currentStatus];
    if (!allowed) {
      console.error(`[FSM KİLİDİ] Tanımsız VEYA Yasaklı başlangıç durumu: ${currentStatus}`);
      return false; 
    }
    
    if (!allowed.includes(nextStatus)) {
      console.error(`[FSM KİLİDİ] Determinizm İhlali! '${currentStatus}' statüsünden '${nextStatus}' statüsüne geçiş FİZİÄE AYKIRIDIR.`);
      return false;
    }

    return true; // Geçiş Meşru.
  }
}

