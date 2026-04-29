// Normalizes complex Hat 3 payloads into table-friendly { columns, rows }
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

function flatten(obj, prefix = '', out = {}) {
  if (obj === null || obj === undefined) {
    out[prefix] = null;
    return out;
  }

  if (typeof obj !== 'object' || obj instanceof Date) {
    const key = prefix || 'value';
    out[key] = obj;
    return out;
  }

  if (Array.isArray(obj)) {
    const key = prefix || 'value';
    // Represent arrays as JSON so table cell stays readable
    out[key] = JSON.stringify(obj);
    return out;
  }

  for (const k of Object.keys(obj)) {
    const newKey = prefix ? `${prefix}.${k}` : k;
    flatten(obj[k], newKey, out);
  }
  return out;
}

function normalizeToRecords(raw) {
  const parsed = tryParseJSON(raw);
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === 'object') {
    // common wrappers
    if (Array.isArray(parsed.records)) return parsed.records;
    if (Array.isArray(parsed.rows)) return parsed.rows;
    return [parsed];
  }
  // primitive
  return [{ value: parsed }];
}

function parseReport(raw, options = {}) {
  // options.adapter (function) may be provided to normalize vendor payloads
  let records;
  if (options && typeof options.adapter === 'function') {
    const adapted = options.adapter(raw);
    if (Array.isArray(adapted)) records = adapted;
    else if (adapted && typeof adapted === 'object') records = [adapted];
    else records = normalizeToRecords(adapted);
  } else {
    records = normalizeToRecords(raw);
  }
  const flatRecords = records.map(r => flatten(r));
  // Apply computed fields and aliases based on original record content
  for (let i = 0; i < records.length; i++) {
    const rec = records[i];
    const flat = flatRecords[i];

    // metrics.total (computed)
    if (!Object.prototype.hasOwnProperty.call(flat, 'metrics.total')) {
      if (rec && rec.metrics && (rec.metrics.completed !== undefined || rec.metrics.pending !== undefined)) {
        const c = Number(rec.metrics.completed) || 0;
        const p = Number(rec.metrics.pending) || 0;
        flat['metrics.total'] = c + p;
      }
    }

    // events.success_rate (computed per-record)
    if (Array.isArray(rec.events)) {
      const total = rec.events.length;
      let success = 0;
      for (const e of rec.events) {
        if (!e) continue;
        const t = (e.type || '').toString().toLowerCase();
        if (t === 'ok' || t === 'success' || t === 'completed') success++;
      }
      flat['events.success_rate'] = total ? success / total : null;
      if (rec.agent) {
        flat['agent.success_rate'] = total ? success / total : null;
      }
    }

    // Alias mapping: meta.ts -> Zaman Damgası
    if (Object.prototype.hasOwnProperty.call(flat, 'meta.ts')) {
      flat['Zaman Damgası'] = flat['meta.ts'];
      delete flat['meta.ts'];
    }
  }
  const columnsSet = new Set();
  for (const fr of flatRecords) {
    for (const k of Object.keys(fr)) columnsSet.add(k);
  }
  const columns = Array.from(columnsSet).sort();
  const rows = flatRecords.map(fr => columns.map(c => (Object.prototype.hasOwnProperty.call(fr, c) ? fr[c] : null)));
  return { columns, rows };
}

function escapeCSVCell(cell, sep = ',') {
  if (cell === null || cell === undefined) return '';
  const s = typeof cell === 'string' ? cell : String(cell);
  if (s.includes('"')) {
    // escape quotes
    const escaped = s.replace(/"/g, '""');
    return `"${escaped}"`;
  }
  if (s.includes(sep) || s.includes('\n') || s.includes('\r')) {
    return `"${s}"`;
  }
  return s;
}

function toCSV(table, sep = ',') {
  if (!table || !Array.isArray(table.columns) || !Array.isArray(table.rows)) return '';
  const header = table.columns.map(c => escapeCSVCell(c, sep)).join(sep);
  const lines = [header];
  for (const row of table.rows) {
    const line = row.map(cell => escapeCSVCell(cell, sep)).join(sep);
    lines.push(line);
  }
  return lines.join('\n');
}

module.exports = { parseReport, toCSV };
