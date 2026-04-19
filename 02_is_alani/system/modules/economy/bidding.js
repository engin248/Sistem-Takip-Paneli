function generateBid(agent){
  return {
    agentId: agent.id,
    score: agent.score,
    price: 100 - agent.score * 5
  };
}
module.exports = { generateBid };
