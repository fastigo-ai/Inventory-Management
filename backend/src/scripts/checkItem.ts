import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../../.env') });

import Item from '../modules/items/item.model';

async function check() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/inventory-management');
  console.log('Connected.');
  
  const i101 = await Item.findOne({ 'dynamicData.tempCode': '101' });
  console.log('101:', i101 ? i101.dynamicData?.name : 'Not Found');
  
  const i5 = await Item.findOne({ 'dynamicData.tempCode': '5' });
  console.log('5:', i5 ? i5.dynamicData?.name : 'Not Found');
  
  const byName = await Item.findOne({ 'dynamicData.name': /MS ANGLE 50X50X6/i });
  console.log('byName:', byName ? `${byName.dynamicData?.name} (tempCode: ${byName.dynamicData?.tempCode})` : 'Not Found');

  process.exit(0);
}

check();
