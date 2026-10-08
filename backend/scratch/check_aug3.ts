import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
import mongoose from 'mongoose';
import Item from '../src/modules/items/item.model';
import { ItemSummary } from '../src/modules/reports/summary/summary.schema';

mongoose.connect("mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0").then(async () => {
  const items = await Item.find({ "dynamicData.activity": /Augmentation DTR/i }).lean();
  for (const item of items) {
    console.log(`- ID: ${item._id}, name: ${item.name}, d.name: ${item.dynamicData?.name}, d.itemName: ${item.dynamicData?.itemName}`);
    const summary = await ItemSummary.find({ itemId: item._id }).lean();
    console.log(`  Summaries:`, summary.map(s => ({ _id: s._id, itemName: s.itemName })));
  }
  process.exit();
});
