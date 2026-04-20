// ============================================================
// SİSTEM ALGORİTMALARI: DAG (Directed Acyclic Graph) & TOPOLOJİK SIRALAYICI
// ============================================================
// Yapay zeka halüsinasyon görüp hatalı veya tehlikeli bir 
// görev sırası ürettiğinde (Örn: Veritabanı yapılmadan Frontend yap demesi vb.)
// O AI planını alıp, katı mimari kurallarına göre EZER ve DÜZELTİR.

export interface DAGTask {
    sira: number;
    gorev: string;
    ajan_id: string;
    ajan_kodu: string;
    bagimlilik: number[];
    durum: string;
}

// HİYERARŞİK BAĞIMLILIK AĞIRLIKLARI (Ne kadar düşükse o kadar önce çalışması ŞARTTIR)
const ARCHITECTURE_RULES: Record<string, number> = {
    'A-06': 1,  // GÜVENLİK (Her işlemden önce izin ve kalkan şarttır)
    'A-03': 2,  // DB (Tablolar ve veri yapıları çizilmeden kod yazılamaz)
    'A-02': 3,  // BACKEND / API (Veritabanına bağlanan iş mantığı 3. sıra)
    'D-09': 4,  // ANALİST (Veri çekilip API yazılınca analiz gerekebilir)
    'A-01': 5,  // FRONTEND (Görsel ve UI, ancak backend bittikten sonra tam uyar)
    'K-3':  5,  // ARAşTIRMA (Paralel)
    'K-2':  5,  // PLANLAMA (Paralel)
    'A-05': 90, // TESTER (Bütün işlemler bittikten sonra test edilir)
    'A-04': 99  // BİLDİRİM (Telegram vs. Her şey bitince haber gönderilir)
};

export function enforceTopologicalDiscipline(aiGeneratedTasks: DAGTask[]): DAGTask[] {
    // 1. ZORUNLU AĞIRLIK (WEIGHT) HESAPLAMA
    const strictOrder = [...aiGeneratedTasks].sort((a, b) => {
        const weightA = ARCHITECTURE_RULES[a.ajan_id] ?? 50; 
        const weightB = ARCHITECTURE_RULES[b.ajan_id] ?? 50;
        
        // Eğer her ikisi de aynı ajansa, AI'nin kendi orjinal sırasını (.) koru.
        if (weightA === weightB) {
            return a.sira - b.sira;
        }

        return weightA - weightB; // Düşük Olan ("Güvenlik = 1") En Başa Gelir!
    });

    // 2. SIRA VE BAĞIMLILIKLARI YENİDEN İNŞA ET (DAG REBUILD)
    // Sadece sıraya dizmek yetmez, sırayı idlere ve bagimlilik dizilerine yansıt.
    return strictOrder.map((task, idx) => ({
        ...task,
        sira: idx + 1,
        bagimlilik: idx > 0 ? [idx] : [] // Kendinden bir önceki görevi mecburi kural ataması yap
    }));
}
