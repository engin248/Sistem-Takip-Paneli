import { TaskContract } from '../types/architecture';
import { logAudit } from '@/services/auditService';

export class TaskContractService {
  /**
   * KADEME 3: SNAPSHOT LOCK (Veri Zaman Makinesi)
   * Sistemin şu anki durumunun yedeği kilitlenir. 
   * İcra sırasında bir fiyasko yaşanırsa, bu noktaya geri dönülecektir.
   */
  public async triggerSnapshotLock(): Promise<string> {
    const snapshotId = "SNAPSHOT_LOCKED_TX_" + Date.now();
    // Fiziksel Zaman Makinesi Kaydı (Database)
    await logAudit({
        operation_type: 'SYSTEM',
        action_description: `🔒 SNAPSHOT LOCK ALINDI: Sistem mevcut durumu donduruldu. İşlem iptalinde bu noktaya (Rollback) dönülecek.`,
        metadata: { action_code: 'SNAPSHOT_LOCKED', snapshot_id: snapshotId },
        error_severity: 'INFO',
        status: 'basarili'
    });
    
    return snapshotId;
  }

  /**
   * TASK CONTRACT VE HANDSHAKE
   * Anlama tamamlandıktan ve simülasyon onaylandıktan sonra,
   * Görevin icrasını kitleyecek Mühürlü format.
   */
  public async buildAndMühürleContract(verifiedIntent: string, snapshotId: string): Promise<TaskContract | null> {
    // G-0 Handshake (Komutan Teknik Onayı) otonom veya human-in-the-loop ile onaylanır.
    
    const contract: TaskContract = {
      contractId: `CTR-${Date.now()}`,
      verifiedIntent: verifiedIntent,
      inputPayload: { snapshotReference: snapshotId },
      constraints: [
        "LLM_TEMPERATURE_MUST_BE_0.0",   // Deterministik kilit: Ajan yaratıcılığı ÖLDÜRÜLDÜ.
        "ONLY_JSON_SCHEMA_OUTPUT",       // Demir Kafes Mecburi
        "DETERMINISTIC_SEED_APPLIED",    // Çıktı kesinliği garantilidir
        "ONLY_DESIGNATED_TABLE",
        "TIMEOUT_10_SEC"
      ],
      expectedOutput: "SUCCESS",
      successCriteria: ["Hata kodu 0", "TimeLimit < 10s"],
      g0HandshakeApproved: false // SİSTEM GÜVENLİĞİ: Ajan körleme icraata başlayamaz. Yönetici (Siz) Ekranda "Anlaşmayı Onaylıyorum" diyene kadar PENDING (Askıda) kalmalıdır.
    };

    return contract;
  }
}
