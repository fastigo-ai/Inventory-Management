import mongoose from 'mongoose';
import { buildCeoDashboardSummary } from '../src/modules/dashboard/ceoDashboard.service';
import { StoreTransfer } from '../src/modules/store/storeTransfer.schema';
import { ContractorWorkOrder } from '../src/modules/contractors/contractorWorkOrder.schema';

async function run() {
  await mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  
  // Test StoreTransfer
  const ti = await StoreTransfer.aggregate([
    { $match: { toStore: { $in: [/Nahan/i] }, status: 'RECEIVED' } },
    { $unwind: "$items" },
    { $group: { _id: null, qty: { $sum: "$items.receivedQty" } } }
  ]);
  console.log('Transfer In Nahan:', ti[0]?.qty);

  const to = await StoreTransfer.aggregate([
    { $match: { fromStore: { $in: [/Nahan/i] }, status: { $in: ['IN_TRANSIT', 'RECEIVED'] } } },
    { $unwind: "$items" },
    { $group: { _id: null, qty: { $sum: "$items.dispatchedQty" } } }
  ]);
  console.log('Transfer Out Nahan:', to[0]?.qty);

  // Test ContractorWorkOrder
  const wo = await ContractorWorkOrder.aggregate([
    { $match: { circle: { $in: [/Nahan/i] }, status: { $ne: 'Cancelled' } } },
    { $group: { _id: null, val: { $sum: "$totalValue" }, count: { $sum: 1 } } }
  ]);
  console.log('WO Nahan:', wo[0]);

  process.exit(0);
}
run();
