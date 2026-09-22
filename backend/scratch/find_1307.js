const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const db = mongoose.connection.db;
  const items = await db.collection('items').find({
    $or: [
      { 'dynamicData.loaSerialNo': '1307' },
      { 'dynamicData.loaSerialNumber': '1307' },
      { 'dynamicData.loaSrNo': '1307' },
      { 'dynamicData.sku': '1307' },
      { 'dynamicData.sku': 1307 },
      { 'dynamicData.loaSerialNo': 1307 }
    ]
  }).toArray();
  
  console.log('Found 1307 items:', items.length);
  if (items.length) {
    console.log('Item:', JSON.stringify(items, null, 2));
  }
  process.exit(0);
}).catch(console.error);
