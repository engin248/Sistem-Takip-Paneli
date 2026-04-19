const { tryParseJSON, mapFields } = require('../adapter_utils');

// Example Trendyol adapter.
// Accepts raw payload (object, array or JSON string) and returns an array of
// canonical records with fields like: id, meta:{ts}, metrics:{completed,pending}, events:[], agent
module.exports = function trendyolAdapter(raw) {
  const parsed = tryParseJSON(raw);
  const items = Array.isArray(parsed) ? parsed : (parsed && typeof parsed === 'object' ? (Array.isArray(parsed.data) ? parsed.data : [parsed]) : []);

  return items.map(item => {
    // Declarative mapping: canonical target -> source path or function
    const spec = {
      'id': item => item.orderId || item.id || item.tn_id || item.reference,
      'meta.ts': item => item.timestamp || item.time || item.ts || (item.meta && item.meta.timestamp),
      'meta.source': () => 'trendyol',
      'metrics.completed': item => {
        if (item.metrics) return item.metrics.success || item.metrics.completed;
        return item.completedCount || item.successCount;
      },
      'metrics.pending': item => {
        if (item.metrics) return item.metrics.pending || item.metrics.failed || 0;
        return item.pendingCount || item.failedCount || 0;
      },
      'events': item => item.events || item.activities || [],
      'agent': item => item.agent || item.seller || item.vendor
    };

    const canonical = mapFields(spec, item);
    return canonical;
  });
};
