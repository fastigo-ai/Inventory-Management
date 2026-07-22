import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { StoreInwardEntry } from './src/modules/store/storeInwardEntry.schema';

dotenv.config();

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI as string);
  const inwardEntries = [
      {
        purchaseInvoiceId: new mongoose.Types.ObjectId(),
        purchaseOrderId: new mongoose.Types.ObjectId(),
        poNumber: "PO-TEST",
        cgst: 9,
        sgst: 9,
        igst: 0,
        status: 'PENDING_RECEIPT'
      }
  ];
  await StoreInwardEntry.insertMany(inwardEntries);
  const found = await StoreInwardEntry.findOne({ poNumber: "PO-TEST" });
  console.log(JSON.stringify(found, null, 2));
  await StoreInwardEntry.deleteMany({ poNumber: "PO-TEST" });
  process.exit(0);
}
run();
