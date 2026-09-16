import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../../.env') });
const Item = mongoose.models.Item || mongoose.model('Item', new mongoose.Schema({}, { strict: false }), 'items');

async function check() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  const items = await Item.find({ isDeleted: { $ne: true }, 'dynamicData.circle': /^Nahan$/i }).lean();
  
  const acts = new Set(items.map((i:any) => (i.dynamicData?.activity || 'Uncategorized').trim()));
  console.log('Trimmed unique activities:', acts.size);
  console.log(Array.from(acts));
  process.exit(0);
}
check();
