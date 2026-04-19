const { agents } = require('../../network/registry');

function enforce(){
  if(agents.length>10) agents.splice(10);
}
module.exports = { enforce };
