import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../../.env') });
const Item = mongoose.model('Item', new mongoose.Schema({}, { strict: false }), 'items');

async function check() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  
  const items1 = await Item.find({ isDeleted: { $ne: true }, 'dynamicData.circle': /Nahan/i }).lean();
  const acts1 = new Set(items1.map((i:any) => i.dynamicData?.activity));
  console.log('Regex /Nahan/i items:', items1.length, 'Unique acts:', acts1.size);
  
  const items2 = await Item.find({ isDeleted: { $ne: true }, 'dynamicData.circle': /^Nahan$/i }).lean();
  const acts2 = new Set(items2.map((i:any) => i.dynamicData?.activity));
  console.log('Regex /^Nahan$/i items:', items2.length, 'Unique acts:', acts2.size);
  
  // Find which activities are missing
  const missing = new Set([...acts1].filter(x => !acts2.has(x)));
  console.log('Missing activities:', Array.from(missing));
  
  process.exit(0);
}
check();
