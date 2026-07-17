import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { PurchaseOrder } from './src/modules/purchases/purchaseOrder.schema';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const po = new PurchaseOrder({
    purchaseOrderNumber: 'PO-TEST-' + Date.now(),
    vendorName: 'Test',
    date: new Date(),
    subTotal: 1000,
    cgstPercentage: 9,
    sgstPercentage: 9,
    total: 1180
  });
  await po.save();
  console.log("Saved Mongoose doc:", JSON.stringify(po.toObject(), null, 2));
  
  const nativeDoc = await mongoose.connection.collection('purchaseorders').findOne({ _id: po._id });
  console.log("Saved Native doc:", JSON.stringify(nativeDoc, null, 2));
  
  await mongoose.disconnect();
}
run().catch(console.error);
