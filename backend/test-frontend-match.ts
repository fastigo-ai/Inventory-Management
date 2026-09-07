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
    const selectedRef = mhrovs[0];
    
    (selectedRef as any).items?.forEach((i: any) => {
      const itemObj = typeof i.itemId === 'object' && i.itemId !== null ? i.itemId : null;
      const dynamicData = itemObj?.dynamicData || {};
      
      const loaSrNo = i.loaSrNo || i.loaSerialNo || dynamicData.loaSrNo || dynamicData.loaSerialNumber || dynamicData.sku || '';
      
      const diQty = i.diId?.lineItems?.find((diItem: any) => String(diItem.itemId) === String(itemObj?._id) && String(diItem.loaSerialNo) === String(loaSrNo))?.quantity 
          || i.diId?.items?.find((diItem: any) => String(diItem.itemId) === String(itemObj?._id) && String(diItem.loaSerialNo) === String(loaSrNo))?.quantity 
          || 0;
          
      console.log(`Matched diQty: ${diQty} for loaSrNo: ${loaSrNo} Item: ${itemObj?.name}`);
    });

  } else {
    console.log("No MHROVs found");
  }
  process.exit();
});
