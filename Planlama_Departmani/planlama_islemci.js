/**
 * planlama_islemci.js — Görev İşleme Motoru
 * Sorumluluk: routeTaskG2, analyzeTask, processTask (MikroAdımMotoru ile)
 * Bağımlılık: aiOrchestrator, mikroAdimMotoru, sistemKurallari, discipline
 *
 * MODÜL HATA KODLARI (PIS-xxx — bu modüle özel):
 *   PIS-001 : Sistem kural ihlali — görev giriş red (INVALID_COMMAND)
 *   PIS-002 : G-2 rotalama hatası — fallback anahtar kelime devreye girdi
 *   PIS-003 : Ajan bulunamadı — kadro dışı ID
 *   PIS-004 : Yapıcı analiz başarısız — AI hatası
 *   PIS-005 : Denetçi red — çıktı onaylanmadı
 *   PIS-006 : Çift doğrulama başarısız — FAILED_VALIDATION
 *   PIS-007 : Veritabanı yazma başarısız — Supabase hatası
 *   PIS-008 : Final Gate red — sapma tespit edildi
 */

const AI  = require('../shared/aiOrchestrator');
const MDS = require('../Agent_Uretim_Departmani/roster/discipline.js');
const { MikroAdimMotoru, adimOlustur, standartGörevAdımlari, DURUM } = require('../shared/mikroAdimMotoru.js');
const { promptEnjeksiyon, kuralKontrol, yanitDenetim, ihlalLog }     = require('../shared/sistemKurallari');
const { TAM_KADRO, ajanBul, TAKIM_KODLARI } = require('../Agent_Uretim_Departmani/roster/index.js');
const { kurulMasasiTartis } = require('./kurul_masasi_motoru'); // Tartışma Motoru: Tez + Antitez + Hakem
const { planlamaAlgoritmaPipeline } = require('./algoritma_merkezi'); // 15 Karar Algoritması
const { hermAiTekKarar, baglamOlustur } = require('../shared/hermai_mimarisi'); // HermAI — YBS Ansiklopedi 2025

// ── AJAN LOOKUP TABLOSU ──────────────────────────────────────
const AJANLAR = {};
for (const ajan of TAM_KADRO) {
    AJANLAR[ajan.id] = { isim: ajan.kod_adi, rol: ajan.gorev_tanimi, takim: ajan.takim_kodu, beceriler: ajan.beceriler };
}

/**
 * routeTaskG2 — G-2 rotalama: görevi doğru takıma yönlendirir.
 */
async function routeTaskG2(task) {
    const systemPrompt = `Sen G-2 Görev Rotalayıcısısın. 32 uzman takım var.
Görevi analiz et ve en uygun 2 harflik TAKIM KODUNU döndür. Başka hiçbir şey yazma.
TAKIMLAR: GA RA HU MK ZP MT AT VM AP GT UX TS KK HY BY ER EN TE PO ST VA DO GM SY OP CI YF SD HT HO DK EA`;

    try {
        const r   = await AI.chat(`Görev: ${task.title}\nAçıklama: ${task.description || ''}`, systemPrompt);
        const m   = r.content.trim().toUpperCase().match(/\b([A-Z]{2})\b/);
        if (m && TAKIM_KODLARI[m[1]]) return m[1] + '-01';
    } catch {}

    // Fallback: anahtar kelime eşleştirme
    const l = task.title.toLowerCase();
    if (['veritabanı','sql','migration','tablo'].some(k => l.includes(k))) return 'VM-01';
    if (['api','endpoint','rest','graphql'].some(k => l.includes(k)))      return 'AP-01';
    if (['arayüz','css','tasarım','ui','ux'].some(k => l.includes(k)))     return 'UX-01';
    if (['güvenlik','yetki','token','şifre'].some(k => l.includes(k)))     return 'GT-01';
    if (['hata','bug','sorun','arıza'].some(k => l.includes(k)))           return 'HT-01';
    if (['test','doğrula','kontrol'].some(k => l.includes(k)))             return 'TE-01';
    if (['deploy','yayınla','docker'].some(k => l.includes(k)))            return 'DO-01';
    if (['performans','hız','optimize'].some(k => l.includes(k)))          return 'PO-01';
    if (['risk','tehlike','alternatif'].some(k => l.includes(k)))          return 'RA-01';
    if (['mimari','monolith','microservice'].some(k => l.includes(k)))     return 'MT-01';
    return 'GA-01';
}

/**
 * analyzeTask — Yapıcı ajan görevi AI ile analiz eder.
 */
async function analyzeTask(task, ajanId, log) {
    const agent = AJANLAR[ajanId];
    if (!agent) {
        log(`AJAN BULUNAMADI: ${ajanId}`, 'ERROR');
        return { plan: `Ajan bulunamadı: ${ajanId}`, steps: [], risk: 'yüksek', ajan: ajanId };
    }
    const systemPrompt = `Sen "${agent.isim}" ajanısın.\nUzmanlık: ${agent.rol}\nBeceriler: ${agent.beceriler.join(', ')}\n\n${promptEnjeksiyon(ajanId)}\n\nSADECE uzmanlık alanında çalış. Çıktıyı JSON formatında döndür.\n[HermAI İLKE 2] Çıktında MUTLAKA: [MİKRO_MANTIK] ve [MAKRO_BAĞLAM] alanları olsun.`;
    try {
        // HermAI gorevKonu options ile AI çağrısına gönderilir (aiOrchestrator üfuk enjekte eder)
        const resp = await AI.chat(`Görev: "${task.title}"\nÖncelik: ${task.priority}`, systemPrompt, { temperature: 0.2, gorevKonu: task.title });
        const m    = resp.content.match(/\{[\s\S]*\}/);
        if (m) return JSON.parse(m[0]);
        return { plan: resp.content.substring(0, 500), steps: [], risk: 'belirsiz', ajan: agent.isim, takim: agent.takim };
    } catch (e) {
        log(`ANALİZ HATA [${ajanId}]: ${e.message}`, 'ERROR');
        return { plan: `Hata: ${e.message}`, steps: [], risk: 'yüksek', ajan: agent.isim };
    }
}

/**
 * processTask — MDS-160 Protokolü: 10 adımlı mikro adım motoru ile görev işler.
 */
async function processTask(task, supabase, log) {
    const exeId = MDS.executionIdUret();
    log(`🆔 [${exeId}] İşlem başladı: [${task.task_code}]`);

    // GİRİŞ KONTROLÜ
    const giris = kuralKontrol('GOREV_ISLEM', task.title);
    if (!giris.gecti) {
        const logMsg = ihlalLog('PLANLAMA', giris);
        if (logMsg) log(logMsg, 'WARN');
        await supabase.from('tasks').update({
            status: 'reddedildi', updated_at: new Date().toISOString(),
            metadata: { ...task.metadata, execution_id: exeId, hata_kodu: 'INVALID_COMMAND', sistem_kurallari_red: giris }
        }).eq('id', task.id);
        return { plan: 'INVALID_COMMAND', steps: [], risk: 'yüksek', execution_id: exeId };
    }

    const ajanId = await routeTaskG2(task);
    const ajan   = AJANLAR[ajanId];
    log(`📋 [${exeId}] [G-2] → ${ajan.isim} (${ajanId}) [Takım: ${ajan.takim}]`);

    let analysis = {};

    const motorAdimlar = [
        ...standartGörevAdımlari(task.title, ajanId),

        adimOlustur(4, 'G-2 ROTALAMA', 'Doğru takıma yönlendir', async () => {
            if (!ajan) return { gecti: false, cikti: null, hata: `Ajan bulunamadı: ${ajanId}` };
            return { gecti: true, cikti: { ajanId, ajanIsim: ajan.isim, takim: ajan.takim } };
        }),

        adimOlustur(5, 'KURUL MASASI TARTIŞMASI', 'Tez + Antitez + Hakem → Sentez', async () => {
            // Her alternatif YAPICI tarafından savunulur, ZINDIK tarafından çürütülür,
            // HAKEM puanlar. Tek nokta karar GEÇERSİZ.
            try {
                const kurulRaporu = await kurulMasasiTartis(task, supabase, log);
                analysis.kurul_raporu = {
                    finalKarar:        kurulRaporu.finalKarar,
                    alternatif_sayisi: kurulRaporu.alternatifler?.length || 0,
                    sure_ms:           kurulRaporu.sure_ms,
                    sirali:            kurulRaporu.sentez?.sirali || [],
                    sentez:            kurulRaporu.sentez?.final_metin?.substring(0, 300),
                };
                if (kurulRaporu.finalKarar && kurulRaporu.finalKarar !== 'BELİRSİZ') {
                    analysis.plan = `[KURUL KARARI] ${kurulRaporu.finalKarar}\n\n` + (analysis.plan || '');
                }
                return { gecti: true, cikti: { kurul: kurulRaporu.finalKarar, sure: kurulRaporu.sure_ms } };
            } catch (e) {
                log(`[KURUL] Tartışma motoru hatası: ${e.message}`, 'WARN');
                return { gecti: true, cikti: { kurul: 'HATA_FALLBACK', hata: e.message } };
            }
        }),

        adimOlustur(5, 'YAPICI ANALİZ', `${ajan.isim} analiz eder`, async () => {
            try {
                const sonuc = await analyzeTask(task, ajanId, log);
                sonuc.execution_id = exeId;
                analysis = sonuc;
                return { gecti: true, cikti: { plan: sonuc.plan?.slice(0, 200) } };
            } catch (e) {
                return { gecti: false, cikti: null, hata: `Yapıcı hata: ${e.message}` };
            }
        }),

        adimOlustur(6, '15 KARAR ALGORİTMASI', 'A01→A15 tam pipeline — algoritma_merkezi', async () => {
            // planlamaAlgoritmaPipeline: A01 Giriş Filtresi → A02 G2 Rotalama →
            // A03 Alan Bağımsızlık → A04 Alternatif Sayısı → A05 Tez-Antitez →
            // A06 Hakem Puanlama → A07 Ağırlıklı Sentez → A08 Proje Planı Doğrula →
            // A09 Teknoloji Seçim → A10 Operasyon Planı → A11 Sapma Detektörü →
            // A12 Bağımsız Doğrulama → A13 Uzman Panel → A14 Final Onay Kapısı → A15 Audit İz
            try {
                const algSonuc = await planlamaAlgoritmaPipeline(task, analysis);
                const a14 = algSonuc.kararlar?.a14 || {};
                const a15 = algSonuc.kararlar?.a15 || {};
                
                analysis.algoritma_sonucu = {
                    karar:         algSonuc.final,
                    puan:          a14.puan || 0,
                    gerekce:       a14.neden,
                    sapma_yok:     algSonuc.kararlar?.a11?.sonuc === 'PASS',
                    audit_id:      a15.iz?.zaman || 'YOK',
                    ozet:          algSonuc.ozet
                };
                if (algSonuc.final === 'RED' || algSonuc.final === 'FAIL') {
                    log(`[ALG-15] A14 Final Gate RED — puan: ${analysis.algoritma_sonucu.puan}`, 'WARN');
                    return { gecti: false, cikti: null, hata: `[PIS-008] 15 Algoritma Final Gate RED. Gerekçe: ${a14.neden}` };
                }
                log(`[ALG-15] ✅ Tüm 15 algoritma geçti. Karar: ${algSonuc.final} | Puan: ${analysis.algoritma_sonucu.puan}`);
                return { gecti: true, cikti: { algoritma: algSonuc.final, puan: analysis.algoritma_sonucu.puan, ozet: algSonuc.ozet } };
            } catch (e) {
                log(`[ALG-15] Algoritma pipeline hatası: ${e.message} — devam ediliyor`, 'WARN');
                return { gecti: true, cikti: { algoritma: 'HATA_GECILDI', hata: e.message } };
            }
        }),

        adimOlustur(7, 'ÇIKTI FİLTRELEME', 'MDS-160 VI — yasaklı ifadeler', async () => {
            if (analysis?.plan) {
                const f = MDS.ciktiFiltreyle(analysis.plan);
                if (f.filtrelenen > 0) { log(`🧹 [${exeId}] ${f.filtrelenen} ifade filtrelendi.`); analysis.plan = f.temiz; }
            }
            return { gecti: true, cikti: { filtre: 'PASS' } };
        }),

        adimOlustur(7, 'DENETÇİ KONTROLÜ', `${ajan.takim}-02 onayı`, async () => {
            const dId  = ajan.takim + '-02';
            const daj  = AJANLAR[dId];
            if (!daj) { analysis.denetim = { denetci_id: dId, not: 'Kadroda yok' }; return { gecti: true, cikti: { denetci: 'YOK_GECİLDİ' } }; }
            try {
                const r = await AI.chat(`Sen "${daj.isim}" denetçisisin.\nYAPICI ÇIKTISI:\n${JSON.stringify(analysis, null, 2)}\nJSON: {"onay":true/false,"notlar":"..."}`, 'Sadece kontrol yap.', { temperature: 0.1 });
                const m = r.content.match(/\{[\s\S]*\}/);
                if (m) {
                    const d = JSON.parse(m[0]);
                    analysis.denetim = { denetci_id: dId, ...d };
                    if (d.onay === false) return { gecti: false, cikti: null, hata: `Denetçi RET: ${d.notlar || ''}` };
                }
                return { gecti: true, cikti: { denetci: 'ONAYLANDI' } };
            } catch (e) {
                analysis.denetim = { hata: e.message };
                return { gecti: true, cikti: { denetci: 'HATA_GECİLDİ' } };
            }
        }),

        adimOlustur(8, 'ÇİFT DOĞRULAMA', 'MDS-160 V', async () => {
            const dg = MDS.ciftDogrulama(analysis, task, ajanBul(ajanId));
            analysis.dogrulama = dg;
            if (!dg.gecti) {
                const r2 = await analyzeTask(task, ajanId, log);
                const d2 = MDS.ciftDogrulama(r2, task, ajanBul(ajanId));
                if (!d2.gecti) return { gecti: false, cikti: null, hata: `FAILED_VALIDATION: ${dg.detay}` };
                analysis = r2; analysis.dogrulama = d2;
            }
            return { gecti: true, cikti: { dogrulama: 'PASS' } };
        }),

        adimOlustur(9, 'VERİTABANI KAYDI', 'Supabase immutable trace', async () => {
            try {
                await supabase.from('tasks').update({
                    status: DURUM.ONAY_BEKLIYOR, updated_at: new Date().toISOString(),
                    metadata: { ...task.metadata, execution_id: exeId, ai_analiz_sonucu: analysis, islenen_ajan: ajanId, islenen_takim: ajan.takim, denetci: analysis.denetim || null, dogrulama: analysis.dogrulama || null, isleme_zamani: new Date().toISOString(), mikro_adim_motor: true }
                }).eq('id', task.id);
                return { gecti: true, cikti: { db: 'YAZILDI' } };
            } catch (e) { return { gecti: false, cikti: null, hata: `DB yazım hata: ${e.message}` }; }
        }),

        adimOlustur(10, 'AUDİT LOG', 'Değiştirilemez iz', async () => {
            try {
                await supabase.from('audit_logs').insert([{ action_code: 'AI_TASK_PROCESSED', operator_id: ajanId, details: { execution_id: exeId, task_id: task.id, task_code: task.task_code, title: task.title, yapici: { id: ajanId, isim: ajan.isim, takim: ajan.takim }, denetci: analysis.denetim || null, dogrulama: analysis.dogrulama || null, plan: analysis.plan, risk: analysis.risk, steps: analysis.steps, mikro_adim_motor: true } }]);
                return { gecti: true, cikti: { audit: 'YAZILDI' } };
            } catch (e) { log(`[${exeId}] Audit yazılamadı: ${e.message}`, 'WARN'); return { gecti: true, cikti: { audit: 'HATA_AMA_DEVAM' } }; }
        }),
    ];

    const motor     = new MikroAdimMotoru(task.id, task.title, motorAdimlar, supabase);
    const motorSonuc = await motor.calistir();
    log(`📌 [${exeId}] [${task.task_code}] → ${ajanId} → ${motorSonuc.durum}`);
    log(`⏳ [${exeId}] ONAY BEKLİYOR — "ONAYLA ${task.task_code}"`);

    // FINAL GATE
    const ys = yanitDenetim(analysis.plan || '', ajanId);
    if (ys.ihlal_var && ys.iptal) {
        log(`🚫 [${exeId}] FINAL GATE RED [${task.task_code}]`, 'WARN');
        analysis.plan = '[DEVIATION_DETECTED] ' + ys.ihlaller.map(i => i.aciklama).join(', ');
    }

    return analysis;
}

module.exports = { processTask, routeTaskG2, analyzeTask, AJANLAR };
