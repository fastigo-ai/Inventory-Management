import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });
import Item from './src/modules/items/item.model';

async function run() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/inventory-management');
  
  const items = await Item.find({ 
    $or: [
      { 'dynamicData.tempCode': '93' },
      { 'dynamicData.tempCode': 93 }
    ]
  }).lean();
  
  console.log(`Found ${items.length} items with Temp Code 93`);
  
  let sumLoa = 0;
  items.forEach((item: any, i) => {
    const qty = Number(item.dynamicData.nahanLoaQuantity || item.dynamicData.loaQuantity || 0);
    sumLoa += qty;
    console.log(`[${i+1}] LOA SR NO: ${item.dynamicData.loaSrNo || item.dynamicData.loaSerialNo || item.dynamicData.sku}, QTY: ${qty}, ACTIVITY: ${item.dynamicData.activity}`);
  });
  console.log(`Total Nahan LOA Quantity for Temp Code 93: ${sumLoa}`);
  
  process.exit(0);
}

run();
