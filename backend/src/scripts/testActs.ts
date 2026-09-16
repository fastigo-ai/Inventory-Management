import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../../.env') });
const itemSchema = new mongoose.Schema({}, { strict: false });
const Item = mongoose.model('Item', itemSchema, 'items');

async function check() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  const items = await Item.find({ isDeleted: { $ne: true }, "dynamicData.circle": /Nahan/i }).lean();
  
  const rawActivities = new Set(items.map((i:any) => i.dynamicData?.activity));
  console.log(`Raw unique activities in DB: ${rawActivities.size}`);
  
  const normalizedActivities = new Set(items.map((i:any) => (i.dynamicData?.activity || '').replace(/\s+/g, '').toLowerCase()));
  console.log(`Normalized unique activities: ${normalizedActivities.size}`);
  
  process.exit(0);
}
check();
