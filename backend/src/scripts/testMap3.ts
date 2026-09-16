import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../../.env') });
const Item = mongoose.models.Item || mongoose.model('Item', new mongoose.Schema({}, { strict: false }), 'items');
const normalizeActivity = (act: string) => (act || '').replace(/\s+/g, '').toLowerCase();

async function check() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  const items = await Item.find({ isDeleted: { $ne: true }, 'dynamicData.circle': /^Nahan$/i }).lean();
  
  const reportMap: any = {};
  items.forEach((i:any) => {
    const actKey = normalizeActivity(i.dynamicData?.activity);
    const ct = (i.dynamicData?.tempCode||'').trim().toLowerCase();
    const cl = (i.dynamicData?.loaSrNo||i.dynamicData?.loaSerialNo||'').trim().toLowerCase();
    
    let pk = '';
    if (ct) pk = `${actKey}_temp_${ct}`;
    else if (cl) pk = `${actKey}_loa_${cl}`;
    else pk = i._id.toString();
    
    reportMap[pk] = 1;
  });
  
  console.log('reportMap rows:', Object.keys(reportMap).length);
  process.exit(0);
}
check();
