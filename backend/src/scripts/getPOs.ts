import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();

const poSchema = new mongoose.Schema({}, { strict: false });
const PO = mongoose.model('PurchaseOrder', poSchema, 'purchaseorders');

async function run() {
  await mongoose.connect(process.env.MONGO_URI!);
  const pos = await PO.find().select('vendorName purchaseOrderNumber').lean();
  console.log(JSON.stringify(pos, null, 2));
  process.exit(0);
}
run();
