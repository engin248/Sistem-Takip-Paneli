fetch('http://localhost:3000/api/health-check')
  .then(r => r.json())
  .then(data => console.log(JSON.stringify(data, null, 2)))
  .catch(console.error);
