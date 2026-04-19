// Dispatcher – selects best agent based on score and status
const { agents } = require('../core/agents');
const axios = require('axios');
const { preExecuteChecks } = require('../modules/memory/memoryManager');
const { retry } = require('../modules/healing/retryHelper');

/**
 * Dispatch a task to the best available agent.
 * Returns the agent response or throws on failure.
 */
async function dispatchTask(task) {
  // Pre‑execution validation (duplicate / anomaly)
  const check = preExecuteChecks(task, 'DISPATCH');
  if (!check.allowed) {
    throw new Error('RED – ' + check.errors.join(' | '));
  }

  // Choose active agents sorted by score descending
  const candidates = agents.filter(a => a.status === 'active');
  if (candidates.length === 0) {
    throw new Error('No active agents available');
  }
  const best = candidates.sort((a, b) => b.score - a.score)[0];

  // Send task via HTTP POST with retry / healing logic
  const send = async () => {
    const res = await axios.post(best.url + '/task', task);
    return res.data;
  };

  return await retry(send, 3, 500);
}

module.exports = { dispatchTask };
