const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/fastigo')
.then(async () => {
  const db = mongoose.connection.db;
  const items = await db.collection('items').find({ 'dynamicData.sku': '1303' }).toArray();
  console.log('Found items with sku 1303:', items.map(i => ({ name: i.dynamicData.name, circle: i.dynamicData.circle })));
  const rcc = await db.collection('items').find({ 'dynamicData.name': 'RCC MUFF' }).toArray();
  console.log('Found RCC MUFF:', rcc.map(i => ({ sku: i.dynamicData.sku, circle: i.dynamicData.circle })));
  process.exit(0);
});
