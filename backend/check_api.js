fetch('http://localhost:5000/api/items?limit=1').then(r=>r.json()).then(data => {
  console.log(JSON.stringify(data, null, 2));
}).catch(console.error);
