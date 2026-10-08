const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const ItemMaster = require('./src/modules/items/item.model').default;
  const item = await ItemMaster.findOne({ 'dynamicData.tempCode': '1' }).lean();
  console.log(Object.keys(item.dynamicData));
  process.exit(0);
});
