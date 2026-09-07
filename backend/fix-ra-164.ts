import mongoose from 'mongoose';
import { ClientBill } from './src/modules/client-billing/clientBill.schema';
import { Mhrov } from './src/modules/store/mhrov.schema';
import './src/modules/di/di.schema'; 
import './src/modules/items/item.model';

mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0').then(async () => {
  const bill = await ClientBill.findOne({ raBillNo: 'RA-164' });
  if (!bill) {
    console.log("Bill RA-164 not found");
    process.exit();
  }

  if (bill.referenceIds && bill.referenceIds.length > 0) {
    const mhrovs = await Mhrov.find({ _id: { $in: bill.referenceIds } })
      .populate("items.diId", "diNumber date lineItems")
      .populate("items.itemId")
      .lean();

    if (mhrovs.length > 0) {
      bill.items.forEach((item: any) => {
        // Find the matching MHROV item
        mhrovs.forEach(m => {
          const mItem = (m as any).items.find((mi: any) => {
            const miIdStr = typeof mi.itemId === 'object' && mi.itemId !== null ? String((mi.itemId as any)._id) : String(mi.itemId);
            return miIdStr === String(item.itemId);
          });

          if (mItem) {
            item.refNumber = m.mhrovNumber;
            item.diNo = mItem.diId?.diNumber || '';
            item.diDate = mItem.diId?.date || null;
            
            const itemIdStr = typeof mItem.itemId === 'object' && mItem.itemId !== null ? String((mItem.itemId as any)._id) : String(mItem.itemId);
            const loaMatch = String(item.loaSrNo);
            
            const match = mItem.diId?.lineItems?.find((diItem: any) => String(diItem.itemId) === itemIdStr && String(diItem.loaSerialNo) === loaMatch)
                       || mItem.diId?.items?.find((diItem: any) => String(diItem.itemId) === itemIdStr && String(diItem.loaSerialNo) === loaMatch)
                       || mItem.diId?.lineItems?.find((diItem: any) => String(diItem.itemId) === itemIdStr)
                       || mItem.diId?.items?.find((diItem: any) => String(diItem.itemId) === itemIdStr);
            
            item.diQty = match?.quantity || 0;
          }
        });
      });
      
      await bill.save();
      console.log("RA-164 successfully migrated with refNumber and diQty!");
    } else {
      console.log("MHROVs not found for this bill");
    }
  }

  process.exit();
});
