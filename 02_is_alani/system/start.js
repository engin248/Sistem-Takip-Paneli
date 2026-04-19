const { runTask } = require('./core/engine');

async function start(){
  await runTask({ type:"api", priority:1 });
  await runTask({ type:"database", priority:1 });
  await runTask({ type:"unknown" });
}

start();
