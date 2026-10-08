import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
import mongoose from 'mongoose';
import Item from '../src/modules/items/item.model';
import { ItemSummary } from '../src/modules/reports/summary/summary.schema';

mongoose.connect("mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0").then(async () => {
  const items = await Item.find({ "dynamicData.activity": /Augmentation DTR Work-11\/0\.4 KV-400 KVA to 630 KV/i }).lean();
  console.log("Master Items Count:", items.length);
  
  for (const item of items) {
    console.log(`- ID: ${item._id}, Name: ${item.name}, Circle: ${item.dynamicData?.circle}, Package: ${item.dynamicData?.package}`);
    const summary = await ItemSummary.findOne({ itemId: item._id }).lean();
    console.log(`  Has Summary: ${!!summary}`);
  }

  const summaries = await ItemSummary.aggregate([
    { $match: { "activity": /Augmentation DTR Work-11\/0\.4 KV-400 KVA to 630 KV/i } },
    { $group: {
        _id: { itemName: "$itemName", circle: "$circle", package: "$package" },
        itemId: { $first: "$itemId" },
      }
    }
  ]);
  console.log("Grouped Summaries Count:", summaries.length);
  process.exit();
});
