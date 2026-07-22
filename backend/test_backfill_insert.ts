import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Pr } from './src/modules/purchases/pr.schema';
import { StoreInwardEntry } from './src/modules/store/storeInwardEntry.schema';

dotenv.config();

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI as string);
  const pr = await Pr.findOne({ purchaseReceiveNumber: 'PR-00002' });
  const item = pr?.lineItems?.[0];
  console.log("ITEM:", item?.cgst, item?.sgst, item?.igst);
  
  const inwardEntry = {
    purchaseInvoiceId: pr?._id,
    purchaseOrderId: pr?.purchaseOrderId,
    poNumber: pr?.purchaseOrderNumber,
    cgst: item?.cgst,
    sgst: item?.sgst,
    igst: item?.igst,
    status: 'PENDING_RECEIPT'
  };
  console.log("MAPPED:", inwardEntry);
  
  const saved = await StoreInwardEntry.create(inwardEntry);
  console.log("SAVED DB DOC:", saved.toObject());
  await StoreInwardEntry.findByIdAndDelete(saved._id);
  
  process.exit(0);
}
run();
