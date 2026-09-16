import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../../.env') });
const itemSchema = new mongoose.Schema({}, { strict: false });
const Item = mongoose.model('Item', itemSchema, 'items');

async function check() {
  await mongoose.connect(process.env.MONGO_URI || '');
  const items = await Item.find({ isDeleted: { $ne: true }, "dynamicData.activity": /Cabling Work - New LT AB Cable 3CX95\+1CX70\+1CX16/i }).lean();
  console.log(`Found ${items.length} items for Cabling Work.`);
  for (let i = 0; i < items.length; i++) {
     const d = items[i] as any;
     console.log(`- ID: ${d._id}, Circle: ${d.dynamicData?.circle}, Name: ${d.dynamicData?.name || d.dynamicData?.description}, TempCode: ${d.dynamicData?.tempCode}`);
  }
  process.exit(0);
}
check();
