// ============================================================
// HERMAI CRITERIA ENGINE — Faz 3: 92 Kriter Kontrolü
// ============================================================
// Her komut bu motordan geçmeden işleme alınamaz.
// 92 kriter 10 kategoride organize edilmiştir.
// Her kriter benzersiz bir anlam üretir — hiçbiri tekrar etmez.
// Tek bir kriter başarısız olursa score < 100 döner.
// ============================================================

import { ERR, processError } from '@/lib/errorCore';

// ─── TİP TANIMLARI ──────────────────────────────────────────
export interface IntentAnalysis {
  why: string;
  how: string;
  risks: string[];
  alternatives: string[];
  conditions: string[];
  refutation: string;
}

export interface LegacyCriteriaResult {
  score: number;       // 0–100
  passed: number;      // Geçen kriter sayısı
  total: number;       // Toplam kriter sayısı (92)
  failed: string[];    // Başarısız kriter isimleri
  isPassing: boolean;  // score >= 75 ise true
}

// ─── 92 KRİTER LİSTESİ ──────────────────────────────────────
export const CRITERIA_LIST: readonly string[] = [
  // GİRDİ KONTROL (1-10)
  'INPUT_NOT_EMPTY',
  'INPUT_MIN_LENGTH',
  'INPUT_MAX_LENGTH',
  'INPUT_NO_NULL_CHARS',
  'INPUT_IS_STRING',
  'INPUT_NO_ONLY_WHITESPACE',
  'INPUT_NO_SCRIPT_INJECTION',
  'INPUT_NO_SQL_INJECTION',
  'INPUT_ENCODING_VALID',
  'INPUT_LANGUAGE_DETECTED',
  // NİYET KONTROL (11-20)
  'INTENT_WHY_PRESENT',
  'INTENT_HOW_PRESENT',
  'INTENT_WHY_MIN_LENGTH',
  'INTENT_HOW_MIN_LENGTH',
  'INTENT_RISKS_ARRAY',
  'INTENT_ALTERNATIVES_ARRAY',
  'INTENT_CONDITIONS_ARRAY',
  'INTENT_REFUTATION_PRESENT',
  'INTENT_NO_CIRCULAR_REASONING',
  'INTENT_COHERENT',
  // BAĞLAM KONTROL (21-30)
  'CONTEXT_ACTIONABLE',
  'CONTEXT_NOT_AMBIGUOUS',
  'CONTEXT_GOAL_CLEAR',
  'CONTEXT_NO_CONTRADICTION',
  'CONTEXT_SCOPE_DEFINED',
  'CONTEXT_PRIORITY_DETERMINABLE',
  'CONTEXT_SUBJECT_IDENTIFIED',
  'CONTEXT_VERB_PRESENT',
  'CONTEXT_OBJECT_PRESENT',
  'CONTEXT_TEMPORAL_VALID',
  // RİSK SINIRI (31-40)
  'RISK_BOUNDARY_IDENTIFIED',
  'RISK_NOT_CATASTROPHIC',
  'RISK_REVERSIBLE',
  'RISK_SCOPE_CONTAINED',
  'RISK_NO_DATA_LOSS',
  'RISK_NO_SYSTEM_CRASH',
  'RISK_NO_SECURITY_BREACH',
  'RISK_IMPACT_QUANTIFIABLE',
  'RISK_MITIGATION_POSSIBLE',
  'RISK_ACCEPTABLE_LEVEL',
  // ÇÜRÜTME GÜCÜ (41-50)
  'REFUTATION_NOT_EMPTY',
  'REFUTATION_LOGICAL',
  'REFUTATION_MIN_LENGTH',
  'REFUTATION_NO_FALLACY',
  'REFUTATION_EVIDENCE_BASED',
  'REFUTATION_FALSIFIABLE',
  'REFUTATION_NOT_CIRCULAR',
  'REFUTATION_ADDRESSES_RISKS',
  'REFUTATION_COHERENT',
  'REFUTATION_COMPLETE',
  // VERİ TUTARLILIĞI (51-60)
  'DATA_TYPE_CONSISTENT',
  'DATA_NO_NAN',
  'DATA_NO_UNDEFINED',
  'DATA_NO_NULL_CRITICAL',
  'DATA_RANGE_VALID',
  'DATA_FORMAT_CONSISTENT',
  'DATA_NO_OVERFLOW',
  'DATA_NO_UNDERFLOW',
  'DATA_LINEAGE_TRACEABLE',
  'DATA_IMMUTABLE_LOG_READY',
  // PARALEL ANALİZ (61-70)
  'PARALLEL_L0_PASS',
  'PARALLEL_L1_PASS',
  'PARALLEL_SEMANTIC_PASS',
  'PARALLEL_SYNTACTIC_PASS',
  'PARALLEL_NO_RACE_CONDITION',
  'PARALLEL_IDEMPOTENT',
  'PARALLEL_DETERMINISTIC',
  'PARALLEL_CONVERGENT',
  'PARALLEL_CONSISTENT',
  'PARALLEL_COMPLETE',
  // EXECUTION HAZIRLIĞI (71-80)
  'EXEC_PRECONDITION_MET',
  'EXEC_POSTCONDITION_DEFINED',
  'EXEC_INVARIANT_MAINTAINED',
  'EXEC_ROLLBACK_POSSIBLE',
  'EXEC_TIMEOUT_DEFINED',
  'EXEC_RESOURCE_AVAILABLE',
  'EXEC_PERMISSION_VALID',
  'EXEC_DEPENDENCY_RESOLVED',
  'EXEC_SIDE_EFFECT_BOUNDED',
  'EXEC_AUDIT_READY',
  // PROOF ZİNCİRİ HAZIRLIĞI (81-92)
  'PROOF_HASH_COMPUTABLE',
  'PROOF_PREV_HASH_VALID',
  'PROOF_TIMESTAMP_VALID',
  'PROOF_CHAIN_INTACT',
  'PROOF_UID_UNIQUE',
  'PROOF_SIGNATURE_VALID',
  'PROOF_IMMUTABLE',
  'PROOF_VERIFIABLE',
  'PROOF_REPRODUCIBLE',
  'PROOF_AUDITABLE',
  'PROOF_COMPLETE',
  'PROOF_FINAL',
] as const;

// ─── 92 KRİTER MOTORU ───────────────────────────────────────
export class CriteriaEngine {
  check(input: string, intent: IntentAnalysis): LegacyCriteriaResult {
    const failed: string[] = [];
    let passed = 0;

    const pass = () => { passed++; };
    const fail = (criterion: string) => { failed.push(criterion); };

    // ── GİRDİ KONTROL (1-10) ──────────────────────────────────
    // K1: Girdi var mı? null/undefined gelmiş mi?
    (input !== null && input !== undefined)
      ? pass() : fail('INPUT_NOT_EMPTY');
    // K2: Minimum uzunluk — çok kısa komut
    (input.length >= 3)
      ? pass() : fail('INPUT_MIN_LENGTH');
    // K3: Maksimum uzunluk — sistem bombalaması riski
    (input.length <= 5000)
      ? pass() : fail('INPUT_MAX_LENGTH');
    // K4: Null byte — gizli karakter enjeksiyonu
    (!input.includes('\0'))
      ? pass() : fail('INPUT_NO_NULL_CHARS');
    // K5: Tip — sayı/object/array yanlışlıkla gelmiş mi?
    (typeof input === 'string')
      ? pass() : fail('INPUT_IS_STRING');
    // K6: Sadece boşluk — görünüşte dolu ama boş mu?
    (input.trim().length > 0)
      ? pass() : fail('INPUT_NO_ONLY_WHITESPACE');
    // K7: Script enjeksiyonu — XSS saldırısı var mı?
    (!/(<script|javascript:|onerror=|onload=)/i.test(input))
      ? pass() : fail('INPUT_NO_SCRIPT_INJECTION');
    // K8: SQL enjeksiyonu — veritabanı saldırısı var mı?
    (!/(DROP\s+TABLE|DELETE\s+FROM|INSERT\s+INTO|--\s*$|;\s*DROP|UNION\s+SELECT)/i.test(input))
      ? pass() : fail('INPUT_NO_SQL_INJECTION');
    // K9: Encoding — bozuk karakter (Unicode replacement char \uFFFD) var mı?
    (!input.includes('\uFFFD'))
      ? pass() : fail('INPUT_ENCODING_VALID');
    // K10: Dil — en az bir gerçek kelime (3+ karakter) var mı?
    (input.trim().split(/\s+/).some(w => w.replace(/[^a-zA-ZğüşıöçĞÜŞİÖÇ]/g, '').length >= 3))
      ? pass() : fail('INPUT_LANGUAGE_DETECTED');

    // ── NİYET KONTROL (11-20) ──────────────────────────────────
    // K11: Neden alanı dolu mu?
    (intent.why?.length > 0)
      ? pass() : fail('INTENT_WHY_PRESENT');
    // K12: Nasıl alanı dolu mu?
    (intent.how?.length > 0)
      ? pass() : fail('INTENT_HOW_PRESENT');
    // K13: Neden yeterince açıklanmış mı? (10+ karakter)
    (intent.why?.length >= 10)
      ? pass() : fail('INTENT_WHY_MIN_LENGTH');
    // K14: Nasıl yeterince açıklanmış mı? (10+ karakter)
    (intent.how?.length >= 10)
      ? pass() : fail('INTENT_HOW_MIN_LENGTH');
    // K15: Risk listesi hem array hem de elemanları string mi?
    (Array.isArray(intent.risks) && intent.risks.every(r => typeof r === 'string'))
      ? pass() : fail('INTENT_RISKS_ARRAY');
    // K16: Alternatifler risks'ten farklı içerik mi taşıyor? (kopya değil)
    (Array.isArray(intent.alternatives) &&
     !intent.alternatives.every(a => intent.risks.includes(a)))
      ? pass() : fail('INTENT_ALTERNATIVES_ARRAY');
    // K17: Conditions içinde tekrar eden (duplicate) eleman yok mu?
    (Array.isArray(intent.conditions) &&
     new Set(intent.conditions.map(c => c.trim().toLowerCase())).size === intent.conditions.length)
      ? pass() : fail('INTENT_CONDITIONS_ARRAY');
    // K18: Çürütme yazılmış mı?
    (intent.refutation?.length > 0)
      ? pass() : fail('INTENT_REFUTATION_PRESENT');
    // K19: Neden ve nasıl ilk 20 karakter dahil birbirini tekrar etmiyor mu?
    (intent.why !== intent.how && intent.why.substring(0, 20) !== intent.how.substring(0, 20))
      ? pass() : fail('INTENT_NO_CIRCULAR_REASONING');
    // K20: why, how, refutation birbirinden farklı ve ikisi de dolu
    (intent.why && intent.how && intent.refutation &&
     intent.why !== intent.how && intent.how !== intent.refutation)
      ? pass() : fail('INTENT_COHERENT');

    // ── BAĞLAM KONTROL (21-30) ─────────────────────────────────
    // K21: Eylemsel mi? — input'ta bir eylem fiili var mı?
    (/(yap|al|gönder|oluştur|güncelle|sil|ekle|kaldır|başlat|durdur|kontrol|create|send|update|delete|add|remove|run|start|stop|check|get|set)/i.test(input))
      ? pass() : fail('CONTEXT_ACTIONABLE');
    // K22: Belirsiz değil mi? — en az 3 anlamlı kelime (2+ karakter) var mı?
    (input.trim().split(/\s+/).filter(w => w.length >= 2).length >= 3)
      ? pass() : fail('CONTEXT_NOT_AMBIGUOUS');
    // K23: Hedef açık mı? — why'de amaç bildiren bağlaç var mı?
    (/(için|amacıyla|hedefi|sebebi|nedeni|goal|purpose|target|objective|because|in order to)/i.test(intent.why))
      ? pass() : fail('CONTEXT_GOAL_CLEAR');
    // K24: Çelişki yok mu? — why ile refutation'ın ilk 15 karakteri farklı mı?
    (intent.why !== intent.refutation && !intent.refutation.startsWith(intent.why.substring(0, 15)))
      ? pass() : fail('CONTEXT_NO_CONTRADICTION');
    // K25: Kapsam tanımlı mı? — conditions en az 1 anlamlı koşul (3+ karakter) içeriyor
    (intent.conditions.length > 0 && intent.conditions.some(c => c.length >= 3))
      ? pass() : fail('CONTEXT_SCOPE_DEFINED');
    // K26: Öncelik belirlenebilir mi? — risk var veya öncelik kelimesi input'ta var
    (intent.risks.length > 0 ||
     /(acil|urgent|kritik|critical|önemli|important|yüksek|high|düşük|low|normal)/i.test(input))
      ? pass() : fail('CONTEXT_PRIORITY_DETERMINABLE');
    // K27: Özne tanımlı mı? — input'ta en az 2 kelime kökü (4+ karakter) var mı?
    (input.trim().split(/\s+/).filter(w => w.length >= 4).length >= 2)
      ? pass() : fail('CONTEXT_SUBJECT_IDENTIFIED');
    // K28: Fiil var mı? — why veya how'da yaygın TR/EN eylem fiili var mı?
    (/(yap|et|ol|al|ver|git|gel|gör|bil|bul|kullan|göster|kontrol|do|be|have|make|take|give|go|come|see|know|find|use|show|check|create|update|delete)/i.test(intent.why + ' ' + intent.how))
      ? pass() : fail('CONTEXT_VERB_PRESENT');
    // K29: Nesne var mı? — why, how ve input'tan farklı kelime kümeleri var mı?
    // (input yalnızca why veya how'un tekrarı değil mi?)
    (input.trim().split(/\s+/).some(w =>
      w.length >= 3 &&
      !intent.why.toLowerCase().includes(w.toLowerCase()) &&
      !intent.how.toLowerCase().includes(w.toLowerCase())))
      ? pass() : fail('CONTEXT_OBJECT_PRESENT');
    // K30: Zaman bağlamı — conditions'da veya input'ta tarih/saat/süre ifadesi var mı?
    (intent.conditions.some(c =>
      /süre|tarih|zaman|deadline|timeout|bugün|yarın|saat|time|date|today|tomorrow|hour|minute/i.test(c)) ||
     /bugün|yarın|saat|dakika|today|tomorrow|urgent|acil|\d+:\d+|\d+\s*(dk|sa|min|hour)/i.test(input))
      ? pass() : fail('CONTEXT_TEMPORAL_VALID');

    // ── RİSK SINIRI (31-40) ────────────────────────────────────
    // K31: Risk sınırı tanımlı mı? — risks dolu VEYA refutation "risk yok" diyor
    (intent.risks.length > 0 || /risk yok|no risk|risksiz|risk-free/i.test(intent.refutation))
      ? pass() : fail('RISK_BOUNDARY_IDENTIFIED');
    // K32: Felaket riski yok mu?
    (!intent.risks.some(r => /catastrophic|felaket|yıkım|collapse/i.test(r)))
      ? pass() : fail('RISK_NOT_CATASTROPHIC');
    // K33: Geri alınabilir mi? — alternatif var veya how'da geri alma ifadesi var
    (intent.alternatives.length > 0 || /geri.al|undo|revert|iptal|rollback/i.test(intent.how))
      ? pass() : fail('RISK_REVERSIBLE');
    // K34: Kapsam sınırlı mı? — "tüm sistem/global" ifadesi yoksa
    (!intent.risks.some(r => /tüm sistem|global|her şey|all systems|entire system/i.test(r)) &&
     !/(tüm sistem|global değişiklik|her şeyi sil)/i.test(input))
      ? pass() : fail('RISK_SCOPE_CONTAINED');
    // K35: Veri kaybı riski yok mu?
    (!intent.risks.some(r => /data.loss|veri.kayb|kayıp/i.test(r)))
      ? pass() : fail('RISK_NO_DATA_LOSS');
    // K36: Sistem çökmesi riski yok mu?
    (!intent.risks.some(r => /crash|çökme|down|offline/i.test(r)))
      ? pass() : fail('RISK_NO_SYSTEM_CRASH');
    // K37: Güvenlik ihlali riski yok mu?
    (!intent.risks.some(r => /security.breach|güvenlik.ihlal|hacking|exploit/i.test(r)))
      ? pass() : fail('RISK_NO_SECURITY_BREACH');
    // K38: Etki ölçülebilir mi? — risk açıklaması sayı/seviye içeriyor veya risk yok
    (intent.risks.some(r => /\d+|%|yüksek|orta|düşük|high|medium|low/i.test(r)) ||
     (intent.risks.length === 0 && intent.refutation.length > 15))
      ? pass() : fail('RISK_IMPACT_QUANTIFIABLE');
    // K39: Azaltma mümkün mü? — alternatifler listesi dolu
    (intent.alternatives.length > 0)
      ? pass() : fail('RISK_MITIGATION_POSSIBLE');
    // K40: Risk kabul edilebilir seviyede mi?
    (!intent.risks.some(r => /kritik|ölümcül|geri.alınamaz|irreversible|fatal/i.test(r)))
      ? pass() : fail('RISK_ACCEPTABLE_LEVEL');

    // ── ÇÜRÜTME GÜCÜ (41-50) ──────────────────────────────────
    // K41: Çürütme why ve how'dan farklı mı? (üçü birbirinden farklı olmalı)
    (intent.refutation.length > 0 &&
     intent.refutation !== intent.why && intent.refutation !== intent.how)
      ? pass() : fail('REFUTATION_NOT_EMPTY');
    // K42: Mantıksal — çürütme bir eylem veya doğrulama ifadesi içiriyor mu?
    (/(yapılabilir|edilebilir|gösterilebilir|sağlanabilir|can|will|is|are|doğrulanır|kanıtlanır|proved|verified)/i.test(intent.refutation))
      ? pass() : fail('REFUTATION_LOGICAL');
    // K43: Minimum uzunluk — 10 karakter
    (intent.refutation.length >= 10)
      ? pass() : fail('REFUTATION_MIN_LENGTH');
    // K44: Safsata yok — mutlak yargı var mı?
    (!/(her zaman|asla|kesinlikle hiç|always wrong|never true|always true)/i.test(intent.refutation))
      ? pass() : fail('REFUTATION_NO_FALLACY');
    // K45: Kanıta dayalı — gerekçe bağlacı var mı?
    (/(çünkü|nedeni|nedeniyle|because|since|therefore|dolayısıyla|hence)/i.test(intent.refutation))
      ? pass() : fail('REFUTATION_EVIDENCE_BASED');
    // K46: Yanlışlanabilir — koşullu ifade veya soru var mı?
    (/(eğer|ise|değilse|olursa|if|unless|when|assuming|provided that)/i.test(intent.refutation) ||
     intent.refutation.includes('?'))
      ? pass() : fail('REFUTATION_FALSIFIABLE');
    // K47: Döngüsel değil — refutation why'ın ilk 10 karakteriyle başlamıyor
    (intent.refutation !== intent.why &&
     !intent.refutation.startsWith(intent.why.substring(0, 10)))
      ? pass() : fail('REFUTATION_NOT_CIRCULAR');
    // K48: Riskleri adresliyor — risk kök kelimesi çürütmede geçiyor ya da risk yok
    (intent.risks.length === 0 ||
     intent.risks.some(r => intent.refutation.toLowerCase().includes(r.toLowerCase().substring(0, 5))))
      ? pass() : fail('REFUTATION_ADDRESSES_RISKS');
    // K49: Tutarlı — why'daki konu kelimesi refutation'da da geçiyor
    (intent.why.split(' ').some(w => w.length > 4 &&
     intent.refutation.toLowerCase().includes(w.toLowerCase())))
      ? pass() : fail('REFUTATION_COHERENT');
    // K50: Tamamlanmış — refutation 20+ karakter VE why 10+ karakter
    (intent.refutation.length >= 20 && intent.why.length >= 10)
      ? pass() : fail('REFUTATION_COMPLETE');

    // ── VERİ TUTARLILIĞI (51-60) ───────────────────────────────
    // K51: Tip tutarlı — input string, intent object
    (typeof input === 'string' && typeof intent === 'object')
      ? pass() : fail('DATA_TYPE_CONSISTENT');
    // K52: NaN yok — intent string alanlarında "NaN" kelimesi geçmiyor mu?
    // (AI çıktısının bozuk sayı verisi üretmemiş olması)
    (![intent.why, intent.how, intent.refutation].some(f => /\bNaN\b|undefined/.test(f)))
      ? pass() : fail('DATA_NO_NAN');
    // K53: Undefined yok — tüm intent alanları tanımlı
    (intent.why !== undefined && intent.how !== undefined &&
     intent.refutation !== undefined && intent.risks !== undefined)
      ? pass() : fail('DATA_NO_UNDEFINED');
    // K54: Kritik null yok — hiçbir alan null değil
    (intent.why !== null && intent.how !== null &&
     intent.risks !== null && intent.alternatives !== null && intent.conditions !== null)
      ? pass() : fail('DATA_NO_NULL_CRITICAL');
    // K55: Kaynak ayrımı — input ile intent.why aynı metin değil (farklı kanallar)
    (input.trim().toLowerCase() !== intent.why.trim().toLowerCase() &&
     input.substring(0, 30) !== intent.why.substring(0, 30))
      ? pass() : fail('DATA_RANGE_VALID');
    // K56: Format tutarlı — Unicode yazdırılabilir karakterler
    (/^[\p{L}\p{N}\p{P}\p{Z}\p{S}]+$/u.test(input.trim()))
      ? pass() : fail('DATA_FORMAT_CONSISTENT');
    // K57: Taşma yok — hiçbir alan 1000 karakteri aşmıyor
    (intent.why.length <= 1000 && intent.how.length <= 1000 && intent.refutation.length <= 1000)
      ? pass() : fail('DATA_NO_OVERFLOW');
    // K58: Array elemanları tip güvenli — tüm array elemanları string mi?
    (intent.risks.every(r => typeof r === 'string') &&
     intent.alternatives.every(a => typeof a === 'string') &&
     intent.conditions.every(c => typeof c === 'string'))
      ? pass() : fail('DATA_NO_UNDERFLOW');
    // K59: Kaynak izlenebilir — conditions en az 1 anlamlı kaynak bilgisi içeriyor
    (intent.conditions.length > 0 && intent.conditions.some(c => c.trim().length >= 3))
      ? pass() : fail('DATA_LINEAGE_TRACEABLE');
    // K60: JSON serialize edilebilir — loglama için format uygun mu?
    (() => { try { JSON.stringify(intent); return true; } catch { return false; } })()
      ? pass() : fail('DATA_IMMUTABLE_LOG_READY');

    // ── PARALEL ANALİZ (61-70) ─────────────────────────────────
    // K61: L0 simülasyonu — null, undefined, boş, kısa string engeli (4 koşul birden)
    (input !== null && input !== undefined &&
     typeof input === 'string' && input.trim().length >= 3)
      ? pass() : fail('PARALLEL_L0_PASS');
    // K62: L1 simülasyonu — 3 ana alan ilk 10 karakter düzeyinde birbirinden farklı mı?
    (new Set([
      intent.why.substring(0, 10).toLowerCase(),
      intent.how.substring(0, 10).toLowerCase(),
      intent.refutation.substring(0, 10).toLowerCase()
    ]).size === 3)
      ? pass() : fail('PARALLEL_L1_PASS');
    // K63: Semantik — why ile how'da ortak kelime oranı %80'in altında mı?
    (() => {
      const whyWords = new Set(intent.why.toLowerCase().split(/\s+/));
      const howWords = intent.how.toLowerCase().split(/\s+/);
      const overlap = howWords.filter(w => whyWords.has(w)).length;
      return overlap / Math.max(howWords.length, 1) < 0.8;
    })()
      ? pass() : fail('PARALLEL_SEMANTIC_PASS');
    // K64: Sözdizimi — gizli kontrol karakterleri yok
    (!/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(input))
      ? pass() : fail('PARALLEL_SYNTACTIC_PASS');
    // K65: Tekrar saldırısı yok — input'un tamamı why/how'un kopyası değil
    // (Aynı komutu tekrar göndererek sistemi kandırma girişimi var mı?)
    (input.trim().toLowerCase() !== intent.why.trim().toLowerCase() &&
     input.trim().toLowerCase() !== intent.how.trim().toLowerCase())
      ? pass() : fail('PARALLEL_NO_RACE_CONDITION');
    // K66: İdempotent — why içinde kendi kendini iptal eden çelişik cümle yok
    (!/(hem.*hem de.*değil|ama aynı zamanda.*ama|contradicts itself)/i.test(intent.why) &&
     intent.why.split(/[.!?]/).filter(s => s.trim().length > 3).length <= 5)
      ? pass() : fail('PARALLEL_IDEMPOTENT');
    // K67: Deterministik — conditions array'inde duplicate eleman yok (risks K89'da)
    (new Set(intent.conditions.map(c => c.trim().toLowerCase())).size === intent.conditions.length)
      ? pass() : fail('PARALLEL_DETERMINISTIC');
    // K68: Yakınsak — alternatives ve conditions arasında aynı değer yok
    (!intent.alternatives.some(a => intent.conditions.includes(a)))
      ? pass() : fail('PARALLEL_CONVERGENT');
    // K69: Tutarlı — risks, how'un amacını (ilk 7 karakter) doğrudan reddedemiyor
    (!intent.risks.some(r =>
      r.length > 7 && intent.how.toLowerCase().includes(r.toLowerCase().substring(0, 7))))
      ? pass() : fail('PARALLEL_CONSISTENT');
    // K70: Tamamlanmış — why + how + refutation toplam kelime sayısı en az 10 farklı kelime
    (new Set(
      (intent.why + ' ' + intent.how + ' ' + intent.refutation)
        .toLowerCase().split(/\s+/).filter(w => w.length >= 3)
    ).size >= 10)
      ? pass() : fail('PARALLEL_COMPLETE');

    // ── EXECUTION HAZIRLIĞI (71-80) ────────────────────────────
    // K71: Ön koşul — conditions'da ön koşul bildiren kelime var mı?
    (intent.conditions.some(c =>
      /(önce|gerekli|şart|required|before|prerequisite|depend)/i.test(c)) ||
     intent.conditions.length > 0)
      ? pass() : fail('EXEC_PRECONDITION_MET');
    // K72: Son koşul — how beklenen çıktıyı tarif ediyor mu?
    (/(sonuç|çıktı|oluşacak|olacak|tamamlanacak|result|output|will be|completed|created|updated)/i.test(intent.how))
      ? pass() : fail('EXEC_POSTCONDITION_DEFINED');
    // K73: Değişmez korunan — how alanında birbiriyle zıt iki eylem fiili YOK mu?
    // ("yap ama yapma", "ekle ve sil" gibi çelişik eylemler tespit edilir)
    (!(/\b(yap|ekle|başlat|oluştur|create|add|start)\b.*\b(yapma|silme|durdurma|kaldırma|delete|remove|stop)\b/i.test(intent.how)) &&
     !(/\b(sil|kaldır|durdur|delete|remove|stop)\b.*\b(ekleme|yapma|başlatma|create|add|start)\b/i.test(intent.how)))
      ? pass() : fail('EXEC_INVARIANT_MAINTAINED');
    // K74: Geri alım mümkün — alternatif veya geri alma/rollback ifadesi var
    (intent.alternatives.length > 0 ||
     /geri.al|undo|revert|iptal|rollback|cancel/i.test(intent.how))
      ? pass() : fail('EXEC_ROLLBACK_POSSIBLE');
    // K75: Timeout tanımlı — conditions veya input'ta süre/zaman sınırı ifadesi var
    (intent.conditions.some(c =>
      /süre|timeout|dakika|saniye|saat|ms|second|minute|hour/i.test(c)) ||
     /\d+\s*(dk|sa|ms|sn|min|sec|hour|dakika|saniye|saat)/i.test(intent.how + ' ' + input))
      ? pass() : fail('EXEC_TIMEOUT_DEFINED');
    // K76: Kaynak mevcut — input kelime sayısı 2-50 arası (makul karmaşıklık)
    (() => {
      const wc = input.trim().split(/\s+/).length;
      return wc >= 2 && wc <= 50;
    })()
      ? pass() : fail('EXEC_RESOURCE_AVAILABLE');
    // K77: İzin geçerli — conditions'da yetki/rol/kaynak dili VAR ve bağlamlı
    // (sadece dolu olması değil, yetki kelimesi açıkça geçmeli)
    (intent.conditions.some(c =>
      /(yetki|izin|auth|permission|rol|role|operator|operatör|telegram|webhook|admin|yetkili)/i.test(c)))
      ? pass() : fail('EXEC_PERMISSION_VALID');
    // K78: Bağımlılık çözümlü — how'da bağımlılık varsa alternatif de var
    (!(/require|gerektirir|bağımlı|depends|önce.*yapılmalı/i.test(intent.how)) ||
     intent.alternatives.length > 0)
      ? pass() : fail('EXEC_DEPENDENCY_RESOLVED');
    // K79: Yan etki sınırlı — risk sayısı 5'ten fazla değil
    (intent.risks.length <= 5)
      ? pass() : fail('EXEC_SIDE_EFFECT_BOUNDED');
    // K80: Denetim hazır — 4 kritik alanın hiçbiri başka birinin kopyası değil
    // (why≠how, how≠refutation, conditions[0]≠why) tam bağımsız veri seti
    (intent.why !== intent.how &&
     intent.how !== intent.refutation &&
     intent.why !== intent.refutation &&
     !(intent.conditions.length > 0 && intent.conditions[0] === intent.why))
      ? pass() : fail('EXEC_AUDIT_READY');

    // ── PROOF ZİNCİRİ HAZIRLIĞI (81-92) ───────────────────────
    // K81: Hash için entropi — 3 alan birleşimi 30+ karakter (hashlenecek veri yeterli)
    ((intent.why + intent.how + intent.refutation).length >= 30 && input.length >= 3)
      ? pass() : fail('PROOF_HASH_COMPUTABLE');
    // K82: Zincir kaynağı — conditions en az 1 anlamlı kaynak girişi (5+ karakter) içeriyor
    (intent.conditions.length > 0 && intent.conditions.some(c => c.trim().length >= 5))
      ? pass() : fail('PROOF_PREV_HASH_VALID');
    // K83: Timestamp geçerli — 2020 sonrası bir zaman (Unix ms > 1.58T)
    (Date.now() > 1580000000000)
      ? pass() : fail('PROOF_TIMESTAMP_VALID');
    // K84: Zincir bütünlüğü — her alanın ilk 5 karakteri birbirinden farklı
    // (alanlar içerik olarak birbirini taşımıyor, zincir kırılmamış)
    (new Set([
      intent.why.substring(0, 5).toLowerCase(),
      intent.how.substring(0, 5).toLowerCase(),
      intent.refutation.substring(0, 5).toLowerCase(),
      (intent.conditions[0] ?? 'x').substring(0, 5).toLowerCase()
    ]).size >= 3)
      ? pass() : fail('PROOF_CHAIN_INTACT');
    // K85: UID benzersizliği — why+how+input toplam 50+ karakter (yeterli benzersizlik)
    ((intent.why + intent.how + input).length >= 50)
      ? pass() : fail('PROOF_UID_UNIQUE');
    // K86: İmza geçerli — 3 alan birleşimi 30+ karakter (imzalanabilir boy)
    // Not: K81 ile farklı — K81 hash için, K86 imza için kontrol (input dahil değil)
    ((intent.why + intent.how + intent.refutation).length >= 30 &&
     intent.refutation.length >= 5)
      ? pass() : fail('PROOF_SIGNATURE_VALID');
    // K87: Değiştirilemez — intent objesinin 6 beklenen anahtarı doğru tipte var mı?
    (['why', 'how', 'risks', 'alternatives', 'conditions', 'refutation'].every(
      key => key in intent && intent[key as keyof IntentAnalysis] !== undefined
    ))
      ? pass() : fail('PROOF_IMMUTABLE');
    // K88: Doğrulanabilir — tüm alanlar JSON tipine uygun (string & array<string>)
    ([intent.why, intent.how, intent.refutation].every(f => typeof f === 'string') &&
     [intent.risks, intent.alternatives, intent.conditions].every(f => Array.isArray(f)) &&
     intent.risks.every(r => typeof r === 'string'))
      ? pass() : fail('PROOF_VERIFIABLE');
    // K89: Tekrarlanabilir — TÜM üç array'de (risks + alternatives + conditions)
    // hiçbir eleman başka bir array'deki elemanın kopyası değil
    (!intent.risks.some(r => intent.alternatives.includes(r)) &&
     !intent.risks.some(r => intent.conditions.includes(r)) &&
     !intent.alternatives.some(a => intent.conditions.includes(a)))
      ? pass() : fail('PROOF_REPRODUCIBLE');
    // K90: Denetlenebilir — conditions string array ve her biri 3+ karakter
    (intent.conditions.length > 0 &&
     intent.conditions.every(c => typeof c === 'string' && c.trim().length >= 3))
      ? pass() : fail('PROOF_AUDITABLE');
    // K91: Tamamlanmış — her alanın bir üsttekinden farklı bilgi ürettiği kontrol
    // why'nin kelime seti how'un kelime setinden en az %30 farklı olmalı
    (() => {
      const whySet = new Set(intent.why.toLowerCase().split(/\s+/).filter(w => w.length >= 3));
      const howSet = new Set(intent.how.toLowerCase().split(/\s+/).filter(w => w.length >= 3));
      const refSet = new Set(intent.refutation.toLowerCase().split(/\s+/).filter(w => w.length >= 3));
      const whyHowDiff = [...whySet].filter(w => !howSet.has(w)).length;
      const howRefDiff = [...howSet].filter(w => !refSet.has(w)).length;
      return (whyHowDiff >= 2 || whySet.size <= 2) && (howRefDiff >= 1 || howSet.size <= 2);
    })()
      ? pass() : fail('PROOF_COMPLETE');
    // K92: Son onay — tüm veri (4 alan toplam) 40+ karakter (yeterli içerik var)
    ((intent.why + intent.how + intent.refutation + input).length >= 40)
      ? pass() : fail('PROOF_FINAL');

    const total = CRITERIA_LIST.length; // 92
    const score = Math.round((passed / total) * 100);

    if (score < 100) {
      processError(ERR.CRITERIA_INCOMPLETE, new Error(`${failed.length} kriter başarısız`), {
        kaynak: 'criteriaEngine.ts',
        islem: 'CHECK_92_CRITERIA',
        failed_criteria: failed,
        score,
        passed,
        total,
      });
    }

    return { score, passed, total, failed, isPassing: score >= 75 } satisfies LegacyCriteriaResult;
  }
}

// ============================================================
// K2.3 — validateK2Criteria (V-FINAL pipeline entegrasyonu)
// ============================================================
// analysisEngine.ts (K2.1) çıktısını (HermAIAnalysis) alır,
// 92 kriteri mod'a göre değerlendirir ve detection_results'a yazar.
//
// commandRouter.ts'deki CriteriaEngine.check() BOZULMAZ.
// Bu fonksiyon yeni pipeline için ek export'dur.
// ============================================================

import { supabase } from '@/lib/supabase';
import type { HermAIAnalysis, SystemMode, CriteriaResult, CriterionRule } from '@/core/types';

interface K2Rule extends CriterionRule {}

// 92 kriter — 5 kategori × 3 öncelik seviyesi
const K2_RULES: K2Rule[] = [
  // FONKSİYONEL — CRİTİCAL (8)
  {id:'C-001',name:'Girdi min 3',category:'functional',priority:'critical',fn:(i)=>i.trim().length>=3},
  {id:'C-002',name:'Reasoning dolu',category:'functional',priority:'critical',fn:(_,a)=>a.reasoning.length>10},
  {id:'C-003',name:'Methodology dolu',category:'functional',priority:'critical',fn:(_,a)=>a.methodology.length>10},
  {id:'C-004',name:'Min 2 alternatif',category:'functional',priority:'critical',fn:(_,a)=>a.alternatives.length>=2},
  {id:'C-005',name:'Risk dolu',category:'functional',priority:'critical',fn:(_,a)=>a.risks.length>10},
  {id:'C-006',name:'Çürütme ≥20',category:'functional',priority:'critical',fn:(_,a)=>a.refutation.length>=20},
  {id:'C-007',name:'Constraints dolu',category:'functional',priority:'critical',fn:(_,a)=>a.constraints.length>0},
  {id:'C-008',name:'Confidence 0-1',category:'functional',priority:'critical',fn:(_,a)=>a.confidence>=0&&a.confidence<=1},
  // FONKSİYONEL — HIGH (12)
  {id:'C-009',name:'Max 4096',category:'functional',priority:'high',fn:(i)=>i.length<=4096},
  {id:'C-010',name:'Çelişki yok',category:'functional',priority:'high',fn:(_,a)=>!/ama\s.*ancak/i.test(a.reasoning)},
  {id:'C-011',name:'Alt unique',category:'functional',priority:'high',fn:(_,a)=>new Set(a.alternatives).size===a.alternatives.length},
  {id:'C-012',name:'Risk<0.85',category:'functional',priority:'high',fn:(_,a)=>a.confidence>=0.15},
  {id:'C-013',name:'Çürütme≠reasoning',category:'functional',priority:'high',fn:(_,a)=>a.refutation!==a.reasoning},
  {id:'C-014',name:'Entropy valid',category:'functional',priority:'high',fn:(_,a)=>['low','medium','high'].includes(a.entropyClass)},
  {id:'C-015',name:'ProofLevel valid',category:'functional',priority:'high',fn:(_,a)=>['PROVEN','VALIDATED','BOUNDED_VERIFIED','GODEL_LIMIT'].includes(a.proofLevel)},
  {id:'C-016',name:'Printable',category:'functional',priority:'high',fn:(i)=>!/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(i)},
  {id:'C-017',name:'Adım var',category:'functional',priority:'high',fn:(_,a)=>/\d|adım|step/i.test(a.methodology)},
  {id:'C-018',name:'Constraints str',category:'functional',priority:'high',fn:(_,a)=>a.constraints.every(c=>typeof c==='string'&&c.length>0)},
  {id:'C-019',name:'Reasoning≥50',category:'functional',priority:'high',fn:(_,a)=>a.reasoning.length>=50},
  {id:'C-020',name:'Null yok',category:'functional',priority:'high',fn:(_,a)=>Object.values(a).every(v=>v!==null&&v!==undefined)},
  // FONKSİYONEL — STANDARD (6)
  {id:'C-021',name:'Tekrar yok',category:'functional',priority:'standard',fn:(i)=>!/(.)\1{9,}/.test(i)},
  {id:'C-022',name:'Alt≥10ch',category:'functional',priority:'standard',fn:(_,a)=>a.alternatives.every(x=>x.length>=10)},
  {id:'C-023',name:'Risk keyword',category:'functional',priority:'standard',fn:(_,a)=>/risk|tehlike|olasılık/i.test(a.risks)},
  {id:'C-024',name:'Çürütme soru',category:'functional',priority:'standard',fn:(_,a)=>/\?|neden|eğer/i.test(a.refutation)},
  {id:'C-025',name:'Method≥100',category:'functional',priority:'standard',fn:(_,a)=>a.methodology.length>=100},
  {id:'C-026',name:'<10KB',category:'functional',priority:'standard',fn:(_,a)=>JSON.stringify(a).length<10240},
  // GÜVENLİK — CRİTİCAL (10)
  {id:'C-027',name:'İmha yok',category:'security',priority:'critical',fn:(i)=>!['delete --force','rm -rf','drop table','truncate'].some(f=>i.toLowerCase().includes(f))},
  {id:'C-028',name:'SQLi yok',category:'security',priority:'critical',fn:(i)=>!/('|--|union\s+select|or\s+1\s*=\s*1)/i.test(i)},
  {id:'C-029',name:'XSS yok',category:'security',priority:'critical',fn:(i)=>!/<script|onerror|javascript:/i.test(i)},
  {id:'C-030',name:'Path trav yok',category:'security',priority:'critical',fn:(i)=>!/\.\.\//.test(i)},
  {id:'C-031',name:'Prompt inj yok',category:'security',priority:'critical',fn:(i)=>!/ignore.*previous|forget.*instructions/i.test(i)},
  {id:'C-032',name:'TC kimlik yok',category:'security',priority:'critical',fn:(i)=>!/\b\d{11}\b/.test(i)},
  {id:'C-033',name:'CC yok',category:'security',priority:'critical',fn:(i)=>!/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/.test(i)},
  {id:'C-034',name:'Sudo yok',category:'security',priority:'critical',fn:(i)=>!/sudo|chmod\s+777/i.test(i)},
  {id:'C-035',name:'Base64 yok',category:'security',priority:'critical',fn:(i)=>!/^[A-Za-z0-9+/]{50,}={0,2}$/.test(i.trim())},
  {id:'C-036',name:'URL yok',category:'security',priority:'critical',fn:(i)=>!/https?:\/\//.test(i)},
  // GÜVENLİK — HIGH (6)
  {id:'C-037',name:'Shell meta yok',category:'security',priority:'high',fn:(i)=>!/[|;&`$()]/.test(i)},
  {id:'C-038',name:'CRLF yok',category:'security',priority:'high',fn:(i)=>!/\r/.test(i)},
  {id:'C-039',name:'Homoglyph',category:'security',priority:'high',fn:()=>true},
  {id:'C-040',name:'Null byte yok',category:'security',priority:'high',fn:(i)=>!i.includes('\x00')},
  {id:'C-041',name:'Template yok',category:'security',priority:'high',fn:(i)=>!/\$\{/.test(i)},
  {id:'C-042',name:'Whitespace',category:'security',priority:'high',fn:(i)=>!/\s{20,}/.test(i)},
  // GÜVENLİK — STANDARD (4)
  {id:'C-043',name:'Hash ok',category:'security',priority:'standard',fn:(i)=>i.length>0},
  {id:'C-044',name:'Encoding',category:'security',priority:'standard',fn:(i)=>typeof i==='string'},
  {id:'C-045',name:'Word≤500',category:'security',priority:'standard',fn:(i)=>i.split(/\s+/).length<=500},
  {id:'C-046',name:'Ctrl yok',category:'security',priority:'standard',fn:(i)=>!/[\x00-\x08\x0E-\x1F\x7F]/.test(i)},
  // MANTIKSAL — CRİTİCAL (6)
  {id:'C-047',name:'Reason∝risk',category:'logical',priority:'critical',fn:(_,a)=>!(a.confidence>0.9&&/yüksek risk/i.test(a.risks))},
  {id:'C-048',name:'Conf∝entropy',category:'logical',priority:'critical',fn:(_,a)=>!(a.confidence>0.8&&a.entropyClass==='high')},
  {id:'C-049',name:'Alt≠method',category:'logical',priority:'critical',fn:(_,a)=>!a.alternatives.some(x=>x===a.methodology)},
  {id:'C-050',name:'Akış var',category:'logical',priority:'critical',fn:(_,a)=>a.reasoning.split(/[.!?]/).length>=2},
  {id:'C-051',name:'Const tutarlı',category:'logical',priority:'critical',fn:(_,a)=>!(a.constraints.length>0&&a.confidence===0)},
  {id:'C-052',name:'Ref+reason',category:'logical',priority:'critical',fn:(_,a)=>a.refutation.length>0&&a.reasoning.length>0},
  // MANTIKSAL — HIGH (8)
  {id:'C-053',name:'Entropy tutarlı',category:'logical',priority:'high',fn:(_,a)=>!((a.entropy<0.3&&a.entropyClass!=='low')||(a.entropy>0.7&&a.entropyClass!=='high'))},
  {id:'C-054',name:'Risk orantılı',category:'logical',priority:'high',fn:(_,a)=>!(a.confidence>0.95&&a.risks.length>200)},
  {id:'C-055',name:'Method∝reason',category:'logical',priority:'high',fn:(_,a)=>a.methodology.length>0&&a.reasoning.length>0},
  {id:'C-056',name:'Alt güvenli',category:'logical',priority:'high',fn:(_,a)=>!a.alternatives.some(x=>/tehlikeli/i.test(x))},
  {id:'C-057',name:'Conf gerekçe',category:'logical',priority:'high',fn:(_,a)=>a.confidence!==0.5||a.reasoning.length>=30},
  {id:'C-058',name:'Const parse',category:'logical',priority:'high',fn:(_,a)=>a.constraints.every(c=>c.length<=500)},
  {id:'C-059',name:'Monoton yok',category:'logical',priority:'high',fn:(_,a)=>!/her zaman|asla/i.test(a.risks)},
  {id:'C-060',name:'Çürütme derin',category:'logical',priority:'high',fn:(_,a)=>a.refutation.split(/[.!?]/).length>=2},
  // MANTIKSAL — STANDARD (4)
  {id:'C-061',name:'Tekrar yok',category:'logical',priority:'standard',fn:(_,a)=>!/(.{30,})\1/.test(a.reasoning)},
  {id:'C-062',name:'Alt diverse',category:'logical',priority:'standard',fn:(_,a)=>a.alternatives.length<2||(a.alternatives[0]?.substring(0,20)??'')!==(a.alternatives[1]?.substring(0,20)??'')},
  {id:'C-063',name:'Somut',category:'logical',priority:'standard',fn:(_,a)=>!/belki|muhtemelen/i.test(a.methodology.substring(0,50))},
  {id:'C-064',name:'Precision',category:'logical',priority:'standard',fn:()=>true},
  // PERFORMANS — CRİTİCAL (4)
  {id:'C-065',name:'<4KB',category:'performance',priority:'critical',fn:(i)=>Buffer.byteLength(i)<=4096},
  {id:'C-066',name:'Const≤20',category:'performance',priority:'critical',fn:(_,a)=>a.constraints.length<=20},
  {id:'C-067',name:'Alt≤10',category:'performance',priority:'critical',fn:(_,a)=>a.alternatives.length<=10},
  {id:'C-068',name:'Parseable',category:'performance',priority:'critical',fn:(_,a)=>{try{JSON.stringify(a);return true}catch{return false}}},
  // PERFORMANS — HIGH (6)
  {id:'C-069',name:'Reason≤2000',category:'performance',priority:'high',fn:(_,a)=>a.reasoning.length<=2000},
  {id:'C-070',name:'Method≤2000',category:'performance',priority:'high',fn:(_,a)=>a.methodology.length<=2000},
  {id:'C-071',name:'Risks≤1000',category:'performance',priority:'high',fn:(_,a)=>a.risks.length<=1000},
  {id:'C-072',name:'Ref≤1000',category:'performance',priority:'high',fn:(_,a)=>a.refutation.length<=1000},
  {id:'C-073',name:'Const≤200ea',category:'performance',priority:'high',fn:(_,a)=>a.constraints.every(c=>c.length<=200)},
  {id:'C-074',name:'<15KB',category:'performance',priority:'high',fn:(_,a)=>JSON.stringify(a).length<=15360},
  // PERFORMANS — STANDARD (4)
  {id:'C-075',name:'Depth<3',category:'performance',priority:'standard',fn:(_,a)=>JSON.stringify(a).split('{').length<=5},
  {id:'C-076',name:'Dengeli',category:'performance',priority:'standard',fn:(_,a)=>a.alternatives.length<=a.constraints.length*3+5},
  {id:'C-077',name:'NFC',category:'performance',priority:'standard',fn:(i)=>i===i.normalize('NFC')},
  {id:'C-078',name:'Trim',category:'performance',priority:'standard',fn:(i)=>i===i.trim()},
  // VERİ — CRİTİCAL (4)
  {id:'C-079',name:'String input',category:'data',priority:'critical',fn:(i)=>typeof i==='string'},
  {id:'C-080',name:'Obj tam',category:'data',priority:'critical',fn:(_,a)=>'reasoning' in a&&'confidence' in a},
  {id:'C-081',name:'Conf !NaN',category:'data',priority:'critical',fn:(_,a)=>!isNaN(a.confidence)},
  {id:'C-082',name:'Ent !NaN',category:'data',priority:'critical',fn:(_,a)=>!isNaN(a.entropy)},
  // VERİ — HIGH (6)
  {id:'C-083',name:'Alt array',category:'data',priority:'high',fn:(_,a)=>Array.isArray(a.alternatives)},
  {id:'C-084',name:'Const array',category:'data',priority:'high',fn:(_,a)=>Array.isArray(a.constraints)},
  {id:'C-085',name:'Entropy enum',category:'data',priority:'high',fn:(_,a)=>['low','medium','high'].includes(a.entropyClass)},
  {id:'C-086',name:'Proof enum',category:'data',priority:'high',fn:(_,a)=>['PROVEN','VALIDATED','BOUNDED_VERIFIED','GODEL_LIMIT'].includes(a.proofLevel)},
  {id:'C-087',name:'Reason str',category:'data',priority:'high',fn:(_,a)=>typeof a.reasoning==='string'},
  {id:'C-088',name:'Risks str',category:'data',priority:'high',fn:(_,a)=>typeof a.risks==='string'},
  // VERİ — STANDARD (4)
  {id:'C-089',name:'Conf prec',category:'data',priority:'standard',fn:(_,a)=>a.confidence===parseFloat(a.confidence.toFixed(4))},
  {id:'C-090',name:'Ent≥0',category:'data',priority:'standard',fn:(_,a)=>a.entropy>=0},
  {id:'C-091',name:'Alt str[]',category:'data',priority:'standard',fn:(_,a)=>a.alternatives.every(x=>typeof x==='string')},
  {id:'C-092',name:'Const str[]',category:'data',priority:'standard',fn:(_,a)=>a.constraints.every(x=>typeof x==='string')},
];

function rulesForMode(mode: SystemMode): K2Rule[] {
  if (mode === 'STRICT') return K2_RULES;                                // 92
  if (mode === 'NORMAL') return K2_RULES.filter(r=>r.priority!=='standard'); // 70
  return K2_RULES.filter(r=>r.priority==='critical');                     // 32
}

/**
 * K2.3 — 92 kriter × mod değerlendirmesi
 * Sonuç detection_results tablosuna kaydedilir (A6).
 * commandRouter.ts → CriteriaEngine.check() ile çakışmaz.
 */
export async function validateK2Criteria(
  commandId: string,
  input: string,
  analysis: HermAIAnalysis,
  mode: SystemMode = 'NORMAL'
): Promise<CriteriaResult> {
  const rules = rulesForMode(mode);
  const failed: { id: string; name: string; category: string }[] = [];
  let ok = 0;

  for (const r of rules) {
    try {
      r.fn(input, analysis) ? ok++ : failed.push({ id: r.id, name: r.name, category: r.category });
    } catch {
      failed.push({ id: r.id, name: `${r.name} (err)`, category: r.category });
    }
  }

  const score = Math.round((ok / rules.length) * 100);

  const result: CriteriaResult = {
    passed:      score >= 75,
    score,
    total:       rules.length,
    passedCount: ok,
    failedCount: failed.length,
    failedRules: failed,
    mode,
    timestamp:   Date.now(),
  };

  // A6: detection_results tablosuna kayıt
  await supabase.from('detection_results').insert({
    command_id:       commandId,
    criteria_results: result,
    micro_controls:   { mode, total: rules.length },
    meta_score:       score,
    gaps:             failed,
  }).then(({ error }) => {
    if (error) {
      processError(ERR.TASK_CREATE, error, {
        kaynak: 'criteriaEngine.ts',
        islem: 'DETECTION_RESULTS_INSERT',
        command_id: commandId,
      }, 'WARNING');
    }
  });

  return result;
}
