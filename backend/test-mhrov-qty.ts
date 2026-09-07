import mongoose from 'mongoose';
import { Mhrov } from './src/modules/store/mhrov.schema';
import './src/modules/di/di.schema'; // register DI model
import './src/modules/items/item.model'; // register Item model

mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0').then(async () => {
  const mhrovs = await Mhrov.find({})
    .populate("items.diId", "diNumber date lineItems")
    .populate("items.itemId")
    .sort({ createdAt: -1 })
    .limit(1)
    .lean();
  
  if (mhrovs.length > 0) {
    const item = (mhrovs[0] as any).items[0];
    console.log("MHROV Item:", JSON.stringify({
      itemId: item.itemId,
      diId: item.diId
    }, null, 2));
    
    // Test the diQty matching logic
    const itemObj = typeof item.itemId === 'object' && item.itemId !== null ? item.itemId : null;
    const diQty = item.diId?.lineItems?.find((diItem: any) => String(diItem.itemId) === String(itemObj?._id))?.quantity || 0;
    console.log("Calculated diQty:", diQty);
  } else {
    console.log("No MHROVs found");
  }
  process.exit();
});
