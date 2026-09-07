import mongoose from 'mongoose';
import { Mhrov } from './src/modules/store/mhrov.schema';
import './src/modules/di/di.schema'; // register DI model
import './src/modules/items/item.model'; // register Item model

mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0').then(async () => {
  const mhrovs = await Mhrov.find({})
    .populate("items.diId", "diNumber date lineItems")
    .populate("items.itemId")
    .limit(1)
    .lean();
  
  if (mhrovs.length > 0) {
    console.log("MHROV Number:", mhrovs[0].mhrovNumber);
    console.log("MHROV Status:", mhrovs[0].status);
    console.log("First item diId:", JSON.stringify((mhrovs[0] as any).items[0].diId, null, 2));
  } else {
    console.log("No MHROVs found");
  }
  process.exit();
});
