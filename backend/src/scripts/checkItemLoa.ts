import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../../.env') });

const Item = mongoose.model('Item', new mongoose.Schema({}, { strict: false }), 'items');

async function checkItem() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  
  const items = await Item.find({ 
      "dynamicData.circle": { $regex: /solan/i },
      "dynamicData.sku": "482"
  }).lean() as any[];
  
  console.log(`Found ${items.length} items in Solan with LOA 482`);
  if (items.length > 0) {
      console.log(items[0].dynamicData);
  }
  
  process.exit(0);
}

checkItem().catch(err => {
    console.error(err);
    process.exit(1);
});
