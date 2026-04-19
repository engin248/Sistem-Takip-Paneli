const fs = require("fs");
const file = __dirname+"/memory.json";

function save(entry){
  const d = JSON.parse(fs.readFileSync(file));
  d.data.push(entry);
  fs.writeFileSync(file, JSON.stringify(d,null,2));
}

module.exports = { save };
