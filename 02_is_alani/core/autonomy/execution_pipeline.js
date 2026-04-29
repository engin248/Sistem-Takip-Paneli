'use strict';

function executeTask({ task, agent, decision, attempt }) {
  const plan = `plan:${decision.finalDecision.selected}`;
  const control1 = 'OK';

  if (task.simulate === 'fail' || (task.simulate === 'fail-once' && attempt === 0)) {
    return {
      status: 'FAIL',
      plan,
      control1,
      execution: 'FAIL',
      control2: 'SKIPPED',
      master: 'RESTART',
      result: `${agent.name} yürütmeyi tamamlayamadı`,
    };
  }

  return {
    status: 'OK',
    plan,
    control1,
    execution: 'OK',
    control2: 'OK',
    master: 'OK',
    result: `${agent.name} ${task.type} görevini tamamladı`,
  };
}

module.exports = {
  executeTask,
};
