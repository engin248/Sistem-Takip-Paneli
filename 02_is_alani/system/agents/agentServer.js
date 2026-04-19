const express = require("express");
const app = express();
app.use(express.json());

app.post("/execute", (req,res)=>{
  const t = req.body;

  let result = { success:true, duration:500, cost:0, output:"OK" };

  if(t.type==="api") result.output="API DONE";
  else if(t.type==="database") result.output="DB DONE";
  else result = { success:false, error:"UNKNOWN" };

  res.json(result);
});

app.listen(process.env.PORT || 3001, ()=>console.log("AGENT RUNNING"));
