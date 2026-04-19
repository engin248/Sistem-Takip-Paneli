const { evolve } = require('../modules/evolution/evolution');
const { enforce } = require('../modules/governance/governance');

function cycle(){
  evolve();
  enforce();
}
module.exports = { cycle };
