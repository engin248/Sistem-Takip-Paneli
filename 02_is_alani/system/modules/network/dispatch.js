const { agents } = require('../network/registry');
const { sendTask } = require('../network/agentClient');
const { generateBid } = require('../modules/economy/bidGenerator');
const { reward } = require('../modules/economy/reward');

async function dispatch(task){
  // Filter active agents matching the task type
  const active = agents.filter(a => a.status === 'active' && a.type === task.type);

  // Generate bids for each active agent
  const bids = active.map(a => generateBid(a));

  // Choose the cheapest bid (lowest price)
  const best = bids.sort((a, b) => a.price - b.price)[0];
  const agent = agents.find(a => a.id === best.agentId);

  // Send the task to the selected agent
  const res = await sendTask(agent.url, task);

  // Reward or penalize the agent based on execution result
  reward(agent.id, res.success);

  return res;
}

module.exports = { dispatch };
