'use strict';

function generateSubcriteria(task) {
  const base = ['uygunluk', 'güvenlik', 'performans'];
  const map = {
    api: ['yanıt süresi', 'entegrasyon kararlılığı'],
    database: ['veri bütünlüğü', 'geri alınabilirlik'],
    network: ['erişilebilirlik', 'timeout toleransı'],
    security: ['erişim kontrolü', 'izolasyon'],
    ui: ['kullanılabilirlik', 'erişilebilirlik'],
    performance: ['kaynak verimliliği', 'ölçeklenebilirlik'],
  };

  return [...base, ...(map[task.type] || ['operasyonel tutarlılık', 'izlenebilirlik'])];
}

function generateAlternatives(task, criteria) {
  return [
    {
      id: 'A',
      label: 'Koruyucu uygulama',
      description: `${task.type} görevi için düşük riskli ve geri alınabilir akış`,
      scoreBase: 72 + criteria.length,
    },
    {
      id: 'B',
      label: 'Dengeli uygulama',
      description: `${task.type} görevi için kontrol ve hız dengesi`,
      scoreBase: 76 + criteria.length,
    },
    {
      id: 'C',
      label: 'Hızlı uygulama',
      description: `${task.type} görevi için daha agresif ama hızlı akış`,
      scoreBase: 68 + criteria.length,
    },
  ];
}

function consensusVote(alternative, task) {
  const riskPenalty = task.type === 'security' && alternative.id === 'C' ? 12 : 0;
  const strategic = alternative.id === 'B' ? 28 : 24;
  const technical = alternative.id === 'A' ? 25 : 27;
  const security = alternative.id === 'C' ? 18 : 26;
  const total = strategic + technical + security - riskPenalty;

  return {
    alternativeId: alternative.id,
    strategic,
    technical,
    security,
    total,
  };
}

function decide(task, memoryContext) {
  const topic = task.topic || task.type || 'unknown';
  const criteria = generateSubcriteria(task);
  const alternatives = generateAlternatives(task, criteria);
  const memoryWeight = Math.min(memoryContext.influence || 0, 30);
  const consensus = alternatives.map((alternative) => consensusVote(alternative, task));

  const best = consensus
    .map((summary) => {
      const alternative = alternatives.find((candidate) => candidate.id === summary.alternativeId);
      const finalScore = summary.total + (summary.alternativeId === 'B' ? memoryWeight : Math.floor(memoryWeight / 2));
      return {
        ...summary,
        finalScore,
        alternative,
      };
    })
    .sort((left, right) => right.finalScore - left.finalScore)[0];

  return {
    topic,
    criteriaSource: 'ai-generated-local',
    criteria,
    alternatives,
    consensus,
    memoryWeight,
    finalDecision: {
      selected: best.alternative.id,
      label: best.alternative.label,
      score: best.finalScore,
      rationale: `Konu sabit tutuldu, alt kriterler optimize edildi, A/B/C konsensüs tamamlandı.`,
    },
  };
}

module.exports = {
  decide,
};
