// Lightweight local PoC that simulates an LLM suggestion for field mapping.
// Uses simple normalization and a small thesaurus to suggest canonical targets.

function normalize(s) {
  if (!s && s !== 0) return '';
  return s.toString().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9]+/g, '');
}

const thesaurus = {
  // map common tokens to canonical Turkish target names
  'maliyet': 'Fiyat',
  'fiyat': 'Fiyat',
  'price': 'Fiyat',
  'cost': 'Fiyat',
  'amount': 'Fiyat',
  'priceusd': 'Fiyat',
  'pricetl': 'Fiyat',

  'kumas': 'Kumaş Bilgisi',
  'kumasbilgisi': 'Kumaş Bilgisi',
  'kumasbilgi': 'Kumaş Bilgisi',
  'fabric': 'Kumaş Bilgisi',
  'material': 'Kumaş Bilgisi'
};

function scoreMatch(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.8;
  // character overlap heuristic
  const setA = new Set(a.split(''));
  const setB = new Set(b.split(''));
  let common = 0;
  for (const ch of setA) if (setB.has(ch)) common++;
  const denom = Math.max(setA.size, setB.size) || 1;
  return common / denom;
}

function suggestMapping(fieldName, sampleRecord) {
  const norm = normalize(fieldName);
  // direct thesaurus
  if (thesaurus[norm]) {
    const canonical = thesaurus[norm];
    // if sampleRecord contains a key that maps to same canonical, prefer returning that sample key
    if (sampleRecord && typeof sampleRecord === 'object') {
      for (const k of Object.keys(sampleRecord)) {
        const kn = normalize(k);
        if (thesaurus[kn] && thesaurus[kn] === canonical) {
          return { suggested: canonical, sampleKey: k, confidence: 0.98 };
        }
      }
    }
    return { suggested: canonical, confidence: 0.95 };
  }

  // try to match sampleRecord keys
  if (sampleRecord && typeof sampleRecord === 'object') {
    let best = { key: null, score: 0 };
    for (const k of Object.keys(sampleRecord)) {
      const kn = normalize(k);
      const s = scoreMatch(kn, norm);
      if (s > best.score) best = { key: k, score: s };
    }
    if (best.key && best.score > 0.6) {
      // Map the actual key name to a sensible target via thesaurus if possible
      const mapped = thesaurus[normalize(best.key)];
      if (mapped) return { suggested: mapped, confidence: Math.max(0.6, best.score) };
      // fallback: suggest using the found key name as target (capitalized)
      return { suggested: best.key.charAt(0).toUpperCase() + best.key.slice(1), confidence: best.score };
    }
  }

  return { suggested: null, confidence: 0 };
}

module.exports = { suggestMapping };
