const { agents } = require('../../network/registry');

function evolve(){
  agents.forEach(a=>{
    if(a.score<1) a.status='inactive';
  });
}
module.exports = { evolve };
