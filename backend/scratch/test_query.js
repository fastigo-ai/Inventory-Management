const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Item = require('../dist/modules/items/item.model.js').default;
  const q = { 
    $or: [ 
      { 'dynamicData.tempCode': { $in: ['94', 94] } }, 
      { 'dynamicData.loaSerialNo': { $in: ['1405', 1405] } }, 
      { 'dynamicData.name': { $in: ['GI STAY WIRE (7/3.15 MM)'] } } 
    ] 
  };
  const items = await Item.find(q);
  console.log('Fetched items:', items.length);
  
  const isMatch = (a, b) => { 
    const valA = (a || '').toString().replace(/\s+/g, '').toLowerCase(); 
    const valB = (b || '').toString().replace(/\s+/g, '').toLowerCase(); 
    return valA === valB; 
  };
  
  const item = items.find(i => isMatch(i.dynamicData.loaSerialNo, '1405') && isMatch(i.dynamicData.tempCode, '94'));
  console.log('Found in memory:', !!item);
  if(item) {
    console.log('Item circle:', item.dynamicData.circle);
  }
  process.exit(0);
}).catch(console.error);
