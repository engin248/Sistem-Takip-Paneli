const { agents } = require('../../network/registry');
function reward(id, success){
  const a = agents.find(x=>x.id===id);
  if(!a) return;
  if(success){ a.score++; a.balance+=5; }
  else { a.score-=2; a.balance-=5; }
}
module.exports = { reward };
