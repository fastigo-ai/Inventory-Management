import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
import mongoose from 'mongoose';
import Item from '../src/modules/items/item.model';

mongoose.connect("mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0").then(async () => {
  const items = await Item.aggregate([
    { $group: {
        _id: { name: "$name", circle: "$dynamicData.circle", package: "$dynamicData.package" },
        count: { $sum: 1 }
      }
    },
    { $match: { count: { $gt: 1 } } }
  ]);
  console.log("Duplicates:", items.length);
  process.exit();
});
