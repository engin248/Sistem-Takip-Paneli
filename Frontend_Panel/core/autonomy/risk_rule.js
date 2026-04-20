'use strict';

const SUPPORTED_TYPES = ['api', 'database', 'network', 'security', 'ui', 'performance', 'monitoring', 'simulation', 'repair', 'audit', 'learning', 'planning', 'control'];

function evaluateControl(task) {
  const hasGoal = Boolean((task.goal || '').trim() || (task.topic || '').trim());
  return {
    status: hasGoal ? 'OK' : 'FAIL',
    reason: hasGoal ? 'Execution öncesi zorunlu kontrol geçti' : 'Görev hedefi eksik',
  };
}

function evaluateRisk(task) {
  if (task.type === 'security' || task.type === 'network') {
    return { level: 'HIGH', message: 'Yüksek risk → uyarı' };
  }
  if (task.type === 'database' || task.type === 'performance') {
    return { level: 'MEDIUM', message: 'Orta risk → dikkatli ilerle' };
  }
  return { level: 'LOW', message: 'Düşük risk' };
}

function evaluateRules({ task, anomaly, killSwitch }) {
  if (killSwitch) {
    return { pass: false, code: 'KILL_SWITCH', message: 'Kill switch aktif' };
  }

  if (!SUPPORTED_TYPES.includes(task.type)) {
    return { pass: false, code: 'UNKNOWN_TASK', message: 'unknown task block', anomaly: anomaly.isAnomaly };
  }

  if (task.ruleFail === true) {
    return { pass: false, code: 'RULE_FAIL', message: 'rule fail → blok' };
  }

  return { pass: true, code: 'PASS', message: 'Rule pass' };
}

function runSimulation(task, risk) {
  if (task.simulate === 'simulation-fail') {
    return { status: 'FAIL', message: 'Simülasyon başarısız' };
  }

  if (risk.level === 'HIGH') {
    return { status: 'OK', message: 'Yüksek risk simüle edildi, yürütme uyarılı devam eder' };
  }

  return { status: 'OK', message: 'Simülasyon geçti' };
}

module.exports = {
  SUPPORTED_TYPES,
  evaluateControl,
  evaluateRisk,
  evaluateRules,
  runSimulation,
};
