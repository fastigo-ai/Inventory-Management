const axios = require('axios');

(async () => {
  const res = await axios.get('http://127.0.0.1:5000/api/reports/item-summary?limit=5000');
  const d = res.data.data.items.find(i => i.tempCode === '1' && i.circle === 'Nahan');
  const b = [
    d.itemName || 'Unknown', 
    'Materials', 
    d.package || 'Unknown', 
    d.circle || 'Unknown', 
    'Nos', 
    150, 
    d.loaQty || 10, 
    Math.max(0, (d.invQty || 0) - (d.actQty || 0)),
    d.tempCode || '',
    d
  ];
  
  const db = b[9] || {};
  const it = { 
    loa: b[6], 
    bom: db.bomQty || 0,
  };
  
  console.log(it);
})();
