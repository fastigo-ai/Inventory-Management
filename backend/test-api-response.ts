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
    // Simulate JSON serialization and deserialization (what the frontend receives)
    const apiResponse = JSON.parse(JSON.stringify(mhrovs[0]));
    
    apiResponse.items.forEach((i: any) => {
      const itemObj = typeof i.itemId === 'object' && i.itemId !== null ? i.itemId : null;
      
      const diQty = i.diId?.lineItems?.find((diItem: any) => String(diItem.itemId) === String(itemObj?._id))?.quantity 
          || i.diId?.items?.find((diItem: any) => String(diItem.itemId) === String(itemObj?._id))?.quantity 
          || 0;
          
      console.log(`Matched diQty: ${diQty} for item: ${itemObj?._id} -> diId lineitems: ${i.diId?.lineItems?.map((x: any) => x.itemId).join(', ')}`);
    });
  }
  process.exit();
});
