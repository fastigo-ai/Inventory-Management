import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { StoreInwardEntry } from './src/modules/store/storeInwardEntry.schema';
import { PurchaseInvoice } from './src/modules/purchases/purchaseInvoice.schema';

dotenv.config({ path: 'c:/Users/sanjeet kumar/Desktop/DoortwoFy/erp-system/backend/.env' });

const MONGO_URI = process.env.MONGO_URI as string;

async function checkInv() {
  try {
    await mongoose.connect(MONGO_URI);
    
    const entries = await StoreInwardEntry.find({ invoiceNumber: 'INV-01118' });
    console.log(JSON.stringify(entries.map((e: any) => ({
      itemName: e.itemName,
      invoiceQty: e.invoiceQty,
      totalQty: e.totalQty,
      purchaseInvoiceId: e.purchaseInvoiceId
    })), null, 2));
    
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

checkInv();
