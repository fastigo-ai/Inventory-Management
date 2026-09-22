const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const db = mongoose.connection.db;
  const items = await db.collection('items').find({
    $or: [
      { 'dynamicData.tempCode': '87' },
      { 'dynamicData.tempCode': 87 }
    ]
  }).toArray();
  
  console.log('Found TempCode 87 items:', items.length);
  const distinctLoa = [...new Set(items.map(i => i.dynamicData.loaSerialNo || i.dynamicData.sku))];
  console.log('Distinct LOAs for TempCode 87:', distinctLoa);
  
  const distinctItems = [...new Set(items.map(i => i.dynamicData.description))];
  console.log('Distinct Desc for TempCode 87:', distinctItems);
  
  process.exit(0);
}).catch(console.error);
