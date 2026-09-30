const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Item = require('../dist/modules/items/item.model.js').default;
  const items = await Item.find({
    'dynamicData.tempCode': { $in: ['94', 94] },
    'dynamicData.circle': { $regex: /solan/i }
  });
  console.log('Solan TempCode 94 items:', items.map(i => ({ loa: i.dynamicData.loaSerialNo, circle: i.dynamicData.circle })));
  process.exit(0);
}).catch(console.error);
