function evaluate(r){
  let score = 0;
  if(r.success) score+=50;
  if(r.duration<1000) score+=20;
  if(!r.error) score+=10;
  return { isValid:r.success, score };
}
module.exports = { evaluate };
