import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
import mongoose from 'mongoose';
import Item from '../src/modules/items/item.model';

mongoose.connect("mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0").then(async () => {
  const item = await Item.findById("6a8299015d7ee9d212355412").lean();
  console.log("Activity:", item.dynamicData?.activity);
  process.exit();
});
