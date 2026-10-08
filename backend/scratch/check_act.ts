import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
import mongoose from 'mongoose';
import Item from '../src/modules/items/item.model';

mongoose.connect("mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0").then(async () => {
  const items = await Item.find({"dynamicData.activity": /Cabling Work - New LT AB Cable 3CX95/}).lean();
  items.forEach(i => console.log(JSON.stringify(i.dynamicData)));
  process.exit();
});
