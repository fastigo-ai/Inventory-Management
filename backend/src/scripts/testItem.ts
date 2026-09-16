import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../../.env') });

const itemSchema = new mongoose.Schema({}, { strict: false });
const Item = mongoose.model('Item', itemSchema, 'items');

async function check() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  
  const items = await Item.find({ "dynamicData.activity": { $regex: /New HT-LT DTRs Work- New 11kV on STP with Rabbit-50 Sqmm/i } }).lean();
  console.log(`Found ${items.length} items total for this activity.`);
  
  for(let i=0; i<Math.min(5, items.length); i++) {
     const d = items[i] as any;
     console.log(`- ID: ${d._id}, TempCode: ${d.dynamicData?.tempCode}, Circle: ${d.dynamicData?.circle}, Name: ${d.dynamicData?.name || d.dynamicData?.description}, Activity: ${d.dynamicData?.activity}`);
  }

  process.exit(0);
}

check().catch(err => {
    console.error(err);
    process.exit(1);
});
