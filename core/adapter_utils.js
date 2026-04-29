const fs = require('fs');
const path = require('path');

// Small helpers to map vendor payloads to the canonical record shape
function tryParseJSON(input) {
  if (typeof input === 'string') {
    try {
      return JSON.parse(input);
    } catch (e) {
      return input;
    }
  }
  return input;
}

function getPath(obj, path) {
  if (!path) return undefined;
  const parts = path.split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

function setPath(obj, path, value) {
  const parts = path.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (i === parts.length - 1) {
      cur[p] = value;
    } else {
      if (!cur[p] || typeof cur[p] !== 'object') cur[p] = {};
      cur = cur[p];
    }
  }
}

function mapFields(spec, src) {
  const out = {};
  for (const target of Object.keys(spec)) {
    const rule = spec[target];
    let val;
    if (typeof rule === 'string') {
      val = getPath(src, rule);
    } else if (typeof rule === 'function') {
      val = rule(src);
    } else if (rule && typeof rule === 'object' && rule.path) {
      val = getPath(src, rule.path);
      if (rule.transform) val = rule.transform(val, src);
    }
    setPath(out, target, val);
  }
  return out;
}

// synonyms persistent store (maps canonical -> [aliases])
const SYN_FILE = path.resolve(__dirname, 'synonyms.json');

function loadSynonyms() {
  try {
    if (fs.existsSync(SYN_FILE)) {
      const raw = fs.readFileSync(SYN_FILE, 'utf8');
      return JSON.parse(raw);
    }
  } catch (e) {}
  return {};
}

function saveSynonyms(obj) {
  fs.writeFileSync(SYN_FILE, JSON.stringify(obj, null, 2), 'utf8');
}

function getSynonymsFor(canonical) {
  const all = loadSynonyms();
  return all[canonical] || [];
}

function addSynonym(canonical, alias) {
  const all = loadSynonyms();
  if (!all[canonical]) all[canonical] = [];
  if (!all[canonical].includes(alias)) {
    all[canonical].push(alias);
    saveSynonyms(all);
  }
}

module.exports = { tryParseJSON, getPath, setPath, mapFields, getSynonymsFor, addSynonym };
