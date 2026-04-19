function calculateRisk(task){
  return task.priority > 5 ? 5 : 1;
}
function isRisky(r){ return r>=5; }
module.exports = { calculateRisk, isRisky };
