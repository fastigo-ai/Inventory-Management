import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
import mongoose from 'mongoose';
import Item from '../src/modules/items/item.model';

mongoose.connect("mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0").then(async () => {
  const items = await Item.find({ "dynamicData.activity": /Augmentation DTR Work-11\/0\.4 KV-400 KVA to 630 KV/i }).lean();
  console.log("Master Items Count:", items.length);
  
  for (const item of items) {
    console.log(`- ID: ${item._id}, ItemName: ${item.dynamicData?.itemName}, Circle: ${item.dynamicData?.circle}`);
  }
  process.exit();
});
