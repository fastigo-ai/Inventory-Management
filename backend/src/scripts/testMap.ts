import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../../.env') });
const Item = mongoose.model('Item', new mongoose.Schema({}, { strict: false }), 'items');

const normalizeActivity = (act: string) => (act || '').replace(/\s+/g, '').toLowerCase();

async function check() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  
  const allItems = await Item.find({ isDeleted: { $ne: true }, 'dynamicData.circle': /^Nahan$/i }).lean();
  
  const reportMap: Record<string, any> = {};

  const getOrAddRow = (itemIdStr: string, loaSrNo: string, tempCode: string | number, activity: string, itemName: string) => {
    const cleanLoa = String(loaSrNo || '').trim().toLowerCase();
    const cleanTemp = String(tempCode || '').trim().toLowerCase();
    const actKey = normalizeActivity(activity);
    
    let primaryKey = '';
    if (cleanTemp) {
      primaryKey = `${actKey}_temp_${cleanTemp}`;
    } else if (cleanLoa) {
      primaryKey = `${actKey}_loa_${cleanLoa}`;
    } else {
      primaryKey = itemIdStr;
    }

    let rowObj = reportMap[primaryKey];
    if (!rowObj) {
      rowObj = {
        itemId: itemIdStr,
        activity: activity || '',
      };
      reportMap[primaryKey] = rowObj;
    }
    return rowObj;
  };
  
  allItems.forEach((item: any) => {
    const act = normalizeActivity(item.dynamicData?.activity);
    if (act) {
       const itemIdStr = item._id.toString();
       const sku = String(item.dynamicData?.sku || '');
       const tempCode = String(item.dynamicData?.tempCode || '');
       const itemName = String(item.dynamicData?.name || '');
       getOrAddRow(itemIdStr, sku, tempCode, item.dynamicData?.activity || '', itemName);
    }
  });

  const apiActs = new Set(Object.values(reportMap).map(r => r.activity));
  const dbActs = new Set(allItems.map((i:any) => i.dynamicData?.activity));
  
  console.log(`reportMap unique activities: ${apiActs.size}, DB activities: ${dbActs.size}`);
  const missing = [...dbActs].filter(x => !apiActs.has(x as any));
  console.log(`Missing activities:`, missing);
  process.exit(0);
}
check();
