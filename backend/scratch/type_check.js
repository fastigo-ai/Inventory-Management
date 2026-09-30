const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Item = require('../dist/modules/items/item.model.js').default;
  const numItems = await Item.countDocuments({ 'dynamicData.loaSerialNo': { $type: 'number' } });
  const strItems = await Item.countDocuments({ 'dynamicData.loaSerialNo': { $type: 'string' } });
  console.log('Number loaSerialNo count:', numItems);
  console.log('String loaSerialNo count:', strItems);
  
  const numTemp = await Item.countDocuments({ 'dynamicData.tempCode': { $type: 'number' } });
  const strTemp = await Item.countDocuments({ 'dynamicData.tempCode': { $type: 'string' } });
  console.log('Number tempCode count:', numTemp);
  console.log('String tempCode count:', strTemp);
  
  process.exit(0);
}).catch(console.error);
