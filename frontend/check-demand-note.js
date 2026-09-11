const fs = require('fs');
// we just need to hit the api
fetch('http://localhost:5000/api/v1/wip-required')
  .then(res => res.json())
  .then(data => {
    const dn = data.data.find(d => d.items.some(i => i.tempCode === '93' || i.tempCode === 93));
    if (dn) {
        const item = dn.items.find(i => i.tempCode === '93' || i.tempCode === 93);
        console.log("ITEM DATA:", item);
    } else {
        console.log("Not found");
    }
  })
  .catch(err => console.error(err));
