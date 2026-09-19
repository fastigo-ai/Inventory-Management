import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../../.env') });

const Item = mongoose.model('Item', new mongoose.Schema({}, { strict: false }), 'items');
const JmcRegister = mongoose.model('JmcRegister', new mongoose.Schema({}, { strict: false }), 'jmcregisters');

async function testExportData() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  
  const jmcs = await JmcRegister.find({ _id: new mongoose.Types.ObjectId("6aa7bab903d852c8500b3ad6") }).lean();
  console.log(`Found JMC: ${jmcs.length}`);
  if (jmcs.length === 0) process.exit(0);
  
  const uniqueActivities = new Set<string>();
  jmcs.forEach((jmc: any) => {
    (jmc.items || []).forEach((item: any) => {
      if (item.activity && String(item.activity).trim() !== '') {
        uniqueActivities.add(String(item.activity).trim());
      }
    });
  });
  
  console.log('Unique activities in JMC:', Array.from(uniqueActivities));
  
  const jmcCircles = new Set<string>();
  jmcs.forEach((jmc: any) => {
    if (jmc.circle) jmcCircles.add(jmc.circle);
  });
  
  const itemFilter: any = {};
  if (jmcCircles.size > 0) {
    itemFilter['dynamicData.circle'] = { $in: Array.from(jmcCircles).map(c => new RegExp(`^${c}$`, 'i')) };
  }
  const items = await Item.find(itemFilter).lean();
  console.log(`Fetched ${items.length} master items for circles:`, Array.from(jmcCircles));
  
  const itemsByActivity: Record<string, any[]> = {};
  Array.from(uniqueActivities).forEach(act => {
    itemsByActivity[act] = [];
  });

  items.forEach((item: any) => {
    const act = item.dynamicData?.activity ? String(item.dynamicData.activity).trim() : '';
    if (act && uniqueActivities.has(act)) {
      itemsByActivity[act].push(item);
    } else if (act) {
       const lowerAct = act.toLowerCase();
       for (const uAct of uniqueActivities) {
         if (uAct.toLowerCase() === lowerAct) {
           itemsByActivity[uAct].push(item);
           break;
         }
       }
    }
  });

  for (const act of uniqueActivities) {
      console.log(`Activity: '${act}' has ${itemsByActivity[act]?.length} master items`);
  }

  process.exit(0);
}

testExportData().catch(err => {
    console.error(err);
    process.exit(1);
});
