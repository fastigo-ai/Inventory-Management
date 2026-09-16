import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const itemSchema = new mongoose.Schema({}, { strict: false });
const Item = mongoose.model('Item', itemSchema);

async function check() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  const items = await Item.find({ 'dynamicData.tempCode': { $in: ['10', '11', '9'] } }).lean();
  console.log('Items found:', items.length);
  for (const it of items) {
     const d = (it as any).dynamicData;
     console.log(`Temp: ${d.tempCode}, Name: ${d.name || d.itemName}, Circle: ${d.circle}, SKU: ${d.sku}, isDeleted: ${(it as any).isDeleted}`);
  }
  process.exit(0);
}
check().catch(console.error);
