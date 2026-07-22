import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { StoreInwardEntry } from './src/modules/store/storeInwardEntry.schema';

dotenv.config();

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI as string);
  const entry = new StoreInwardEntry({
    purchaseOrderId: new mongoose.Types.ObjectId(),
    purchaseInvoiceId: new mongoose.Types.ObjectId(),
    invoiceNumber: "TEST-1",
    status: "PENDING_RECEIPT",
    cgst: 9,
    sgst: 9,
    igst: 0
  });
  await entry.save();
  const saved = await StoreInwardEntry.findById(entry._id);
  console.log(JSON.stringify(saved, null, 2));
  await StoreInwardEntry.findByIdAndDelete(entry._id);
  process.exit(0);
}
run();
