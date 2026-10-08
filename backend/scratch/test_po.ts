import mongoose from 'mongoose';
import { PurchaseOrder } from '../src/modules/purchases/purchaseOrder.schema';

async function run() {
  await mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  const pos = await PurchaseOrder.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } }
  ]);
  console.log(pos);
  process.exit(0);
}
run();
