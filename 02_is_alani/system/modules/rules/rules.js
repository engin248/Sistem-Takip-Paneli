function checkRules(task){
  if(task.type==="unknown") return "BLOCK";
  return null;
}
module.exports = { checkRules };
