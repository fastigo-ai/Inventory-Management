import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
import mongoose from 'mongoose';
import Item from '../src/modules/items/item.model';

mongoose.connect("mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0").then(async () => {
  const items = await Item.find({ "dynamicData.activity": /Augmentation DTR/i }).lean();
  
  items.forEach(item => {
    if (String(item.dynamicData.activity).includes('400 KVA to 630')) {
      console.log(`ID: ${item._id}, Name: ${item.dynamicData.itemName}, Activity: '${item.dynamicData.activity}'`);
    }
  });
  process.exit();
});
