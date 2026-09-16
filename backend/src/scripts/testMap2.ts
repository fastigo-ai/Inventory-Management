import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../../.env') });
const Item = mongoose.models.Item || mongoose.model('Item', new mongoose.Schema({}, { strict: false }), 'items');

const normalizeActivity = (act: string) => (act || '').replace(/\s+/g, '').toLowerCase();

async function check() {
  await mongoose.connect(process.env.MONGO_URI || '');
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
      rowObj = { itemId: itemIdStr, activity: activity || '' };
      reportMap[primaryKey] = rowObj;
    }
    return rowObj;
  };
  
  allItems.forEach((item: any) => {
    const act = normalizeActivity(item.dynamicData?.activity);
    if (act) {
       getOrAddRow(item._id.toString(), String(item.dynamicData?.sku || ''), String(item.dynamicData?.tempCode || ''), item.dynamicData?.activity || '', '');
    }
  });

  const vals = Object.values(reportMap);
  console.log(`reportMap has ${vals.length} rows`);
  process.exit(0);
}
check();
