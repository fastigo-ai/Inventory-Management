import mongoose from 'mongoose';
import Item from '../src/modules/items/item.model';
mongoose.connect('mongodb://127.0.0.1:27017/inventory-app').then(async () => {
  const item = await Item.findOne({"dynamicData.activity": {$exists: true}}).lean();
  console.log(item?.dynamicData);
  process.exit();
});
