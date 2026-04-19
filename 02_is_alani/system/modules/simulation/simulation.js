async function simulate(task){
  if(task.type==="fail") return { success:false };
  return { success:true };
}
module.exports = { simulate };
