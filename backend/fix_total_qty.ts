import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { StoreInwardEntry } from './src/modules/store/storeInwardEntry.schema';
import { PurchaseInvoice } from './src/modules/purchases/purchaseInvoice.schema';

dotenv.config({ path: 'c:/Users/sanjeet kumar/Desktop/DoortwoFy/erp-system/backend/.env' });

const MONGO_URI = process.env.MONGO_URI as string;

async function fixTotalQty() {
  try {
    await mongoose.connect(MONGO_URI);
    
    const entries = await StoreInwardEntry.find({ 
      purchaseInvoiceId: { $exists: true } 
    });
    
    let updatedCount = 0;
    
    for (const entry of entries) {
      if (entry.purchaseInvoiceId) {
        const pi: any = await PurchaseInvoice.findById(entry.purchaseInvoiceId);
        if (!pi) continue;
        
        const piItem = pi.lineItems.find((item: any) => item.itemId?.toString() === entry.itemId?.toString() || item.itemName === entry.itemName);
        
        if (piItem) {
          // In PurchaseInvoice schema, totalInventory holds the total invoice qty (SRT + ACT)
          // quantity holds the Balance Qty
          const correctTotalQty = piItem.totalInventory !== undefined ? piItem.totalInventory : piItem.quantity;
          
          if (entry.totalQty !== correctTotalQty) {
            console.log(`Fixing ${entry.invoiceNumber} - ${entry.itemName}: totalQty from ${entry.totalQty} to ${correctTotalQty}`);
            entry.totalQty = correctTotalQty;
            await entry.save();
            updatedCount++;
          }
        }
      }
    }
    
    console.log(`Successfully updated ${updatedCount} entries.`);
    
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

fixTotalQty();
