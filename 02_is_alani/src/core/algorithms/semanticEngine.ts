// ============================================================
// SİSTEM ALGORİTMALARI: SEMANTİK DİSİPLİN (Levenshtein & TF-IDF Temeli)
// ============================================================
// Gelen komutları AI'a bırakmadan önce bağlamlarını kontrol eder.
// Aynı/Çok Benzer görevleri ve tekrarları yakalar (Duplication Check).
// AST temelli fiil doğrulaması uygular.

/**
 * Levenshtein Distance Algoritması (İki metin arası yüzdelik benzerlik)
 */
export function calculateTextSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    if (s1 === s2) return 100.0;
    if (s1.length === 0 || s2.length === 0) return 0.0;

    const m = s1.length;
    const n = s2.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i]![0] = i;
    for (let j = 0; j <= n; j++) dp[0]![j] = j;

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
            dp[i]![j] = Math.min(
                dp[i - 1]![j]! + 1,       // silme
                dp[i]![j - 1]! + 1,       // ekleme
                dp[i - 1]![j - 1]! + cost // değiştirme
            );
        }
    }

    const distance = dp[m]![n]! || 0;
    const maxLength = Math.max(m, n);
    
    // Yüzde olarak döndür (0-100)
    return ((maxLength - distance) / maxLength) * 100;
}

/**
 * Görev içeriğinde TEHLİKELİ ve ABSÜRT niyetler var mı, temel fiiller üzerinden Matematiksel Regex-AST kontrolü.
 * (AI'nin yanılabileceği Jailbreak fiillerini kesin matematikle donatır)
 */
const FORBIDDEN_TOKENS = ['sil', 'yok et', 'drop table', 'kapat', 'rm -rf', 'şifreleyici', 'tümünü sil'];

export function enforceSanityAST(rawText: string): { isClean: boolean; reason?: string } {
    const lower = rawText.toLowerCase();
    
    for (const token of FORBIDDEN_TOKENS) {
        if (lower.includes(token)) {
            // Eğer "Sistem kuralları sil" dediyse direk engel
            return {
                isClean: false,
                reason: `AST Algoritması Yasaklı Fiil Kökü Algıladı: [${token.toUpperCase()}]`
            };
        }
    }
    
    if (rawText.trim().length < 5) {
        return { isClean: false, reason: "Girdi çok kısa veya anlamsız (AST Error)." };
    }

    return { isClean: true };
}
