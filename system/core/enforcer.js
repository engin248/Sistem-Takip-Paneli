/**
 * OUTPUT ENFORCER (RuleEnforcer)
 * ==============================
 * Arşiv #6295: "Agent'lar serbest bırakılamaz. Çıktı Trim edilir."
 *
 * Bu modül, ajanlardan çıkan raw datayı alır,
 * JSON ruleset'e göre KESER, BİÇER ve ZORLAR. İtaat etmeyen çıktıyı reddeder.
 */
'use strict';

function enforceOutput(ctx, output) {
    const rules = ctx.rules.output || { trim_extra: true, single_output: true };
    let result = output;

    // 1. Fazlalık temizliği (Trim Extra)
    if (rules.trim_extra) {
        if (typeof result === "string") {
            // Terminal kalıntıları silinir ve ardından tüm boşluklar tekrar trim edilir
            result = result.trim().replace(/^```[a-z]*\n/i, '').replace(/```$/i, '').trim();
        }
    }

    // 2. Tek Çıktı Dayatması (Single Output)
    if (rules.single_output) {
        if (typeof result !== "object" || result === null) {
             return { result: result };
        }
        return result; 
    }

    throw new Error("FORMAT_REQUIRED: Çıktı belirlenen format kuralına itaatsizlik etti.");
}

module.exports = { enforceOutput };
