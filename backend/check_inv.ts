import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { StoreInwardEntry } from './src/modules/store/storeInwardEntry.schema';
import { PurchaseInvoice } from './src/modules/purchases/purchaseInvoice.schema';

dotenv.config({ path: 'c:/Users/sanjeet kumar/Desktop/DoortwoFy/erp-system/backend/.env' });

const MONGO_URI = process.env.MONGO_URI as string;

async function checkInv() {
  try {
    await mongoose.connect(MONGO_URI);
    
    const inv = await PurchaseInvoice.findOne({ invoiceNumber: 'INV-01118' });
    console.log(JSON.stringify(inv.lineItems.map((l: any) => ({
      itemName: l.itemName,
      diQuantity: l.diQuantity,
      quantity: l.quantity,
      totalInventory: l.totalInventory,
      srt: l.srt,
      act: l.act
    })), null, 2));
    
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

checkInv();
