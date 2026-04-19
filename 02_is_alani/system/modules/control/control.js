function runAllControls(task){
  if(!task) return false;
  if(!task.type) return false;
  return true;
}
module.exports = { runAllControls };
