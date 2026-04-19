const { dispatch } = require('./dispatcher');
const { simulate } = require('../modules/simulation/simulator');
const { evaluate } = require('../modules/evaluation/evaluator');
const { runAllControls } = require('../modules/control/multiControl');
const { checkRules } = require('../modules/rules/ruleEngine');
const { calculateRisk } = require('../modules/risk/riskEngine');
const { heal } = require('../modules/healing/selfHealing');
const { save } = require('../modules/memory/memory');
const { allow } = require('../modules/protection/acl');

async function runTask(task){
  if(!runAllControls(task)) return console.log('CONTROL FAIL');

  if(checkRules(task)) return console.log('RULE BLOCK');

  calculateRisk(task);

  const sim = await simulate(task);
  if(!sim.success) return console.log('SIM FAIL');

  const res = await dispatch(task);

  const evalRes = evaluate(res);

  if(!evalRes.isValid){
    const h = await heal(task, task.retryCount||1);
    if(h.stop) return console.log('FAILED');
    return runTask(h.task);
  }

  if(allow(res)){
    save({ task, res, score: evalRes.score });
  }

  console.log('SUCCESS SCORE:', evalRes.score);
}

module.exports = { runTask };
