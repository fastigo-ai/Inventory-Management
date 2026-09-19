import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../../.env') });

const itemSchema = new mongoose.Schema({}, { strict: false });
const Item = mongoose.model('Item', itemSchema, 'items');

async function check() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  
  const items = await Item.find({ isDeleted: { $ne: true }, "dynamicData.circle": "Solan" }).lean();
  
  const activityItems = items.filter((ai: any) => ai.dynamicData?.activity === 'HVDS Work-New 11/0.440 V \n25 KVA DTR');
  
  console.log(`Found ${activityItems.length} items for this activity.`);
  
  const newItems: any[] = [];
  
  activityItems.forEach((ai: any) => {
      const temp = ai.dynamicData?.tempCode || '';
      const loa = ai.dynamicData?.loaSrNo || ai.dynamicData?.loaSerialNo || ai.dynamicData?.sku || '';
      const desc = ai.dynamicData?.description || ai.dynamicData?.name || '';
      
      const exists = newItems.find(item => 
            (temp && String(item.tempCode) === String(temp)) || 
            (loa && String(item.loaSrNo) === String(loa)) ||
            (desc && String(item.description) === String(desc))
      );
      
      if (!exists) {
          newItems.push({ tempCode: temp, loaSrNo: loa, description: desc });
      } else {
          console.log(`SKIPPED: Temp: ${temp}, LOA: ${loa}, Desc: ${desc}`);
          console.log(`  BECAUSE IT MATCHED: Temp: ${exists.tempCode}, LOA: ${exists.loaSrNo}, Desc: ${exists.description}`);
      }
  });

  console.log(`Total after deduplication: ${newItems.length}`);
  process.exit(0);
}

check().catch(err => {
    console.error(err);
    process.exit(1);
});
