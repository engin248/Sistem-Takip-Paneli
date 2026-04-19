const axios = require("axios");

async function sendTask(url, task){
  try{
    const res = await axios.post(url+"/execute", task);
    return res.data;
  }catch(e){
    return { success:false, error:e.message };
  }
}

module.exports = { sendTask };
