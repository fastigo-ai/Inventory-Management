import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });
import Item from './src/modules/items/item.model';

async function run() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/inventory-management');
  
  const item = await Item.findOne({ 
    $or: [
      { 'dynamicData.loaSrNo': '408' },
      { 'dynamicData.loaSerialNo': '408' },
      { 'dynamicData.loaSerialNumber': '408' },
      { 'dynamicData.sku': '408' }
    ]
  }).lean();
  console.log("ITEM 408:", JSON.stringify(item?.dynamicData, null, 2));
  
  process.exit(0);
}

run();
