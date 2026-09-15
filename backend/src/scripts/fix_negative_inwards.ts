import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { StoreInwardEntry } from '../modules/store/storeInwardEntry.schema';
import { SummaryService } from '../modules/reports/summary/summary.service';

async function fix() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/inventory-management');
  console.log('Connected.');
  
  const entries = await StoreInwardEntry.find({ 
    $or: [
      { invoiceQty: { $lt: 0 } },
      { totalQty: { $lt: 0 } },
      { acceptedQty: { $lt: 0 } }
    ]
  });
  
  console.log(`Found ${entries.length} negative entries total.`);
  
  const itemsToRebuild = new Set<string>();

  for (const entry of entries) {
    if (entry.subcircle && entry.subcircle.toLowerCase().includes('nalagarh')) {
      console.log(`Fixing ${entry.inwardId} (current invoiceQty: ${entry.invoiceQty})`);
      
      if (entry.invoiceQty < 0) entry.invoiceQty = Math.abs(entry.invoiceQty);
      if (entry.totalQty < 0) entry.totalQty = Math.abs(entry.totalQty);
      if (entry.acceptedQty < 0) entry.acceptedQty = Math.abs(entry.acceptedQty);
      if (entry.rate < 0) entry.rate = Math.abs(entry.rate);
      if (entry.amount < 0) entry.amount = Math.abs(entry.amount);
      if (entry.taxableAmount < 0) entry.taxableAmount = Math.abs(entry.taxableAmount);
      if (entry.cgst < 0) entry.cgst = Math.abs(entry.cgst);
      if (entry.sgst < 0) entry.sgst = Math.abs(entry.sgst);
      if (entry.igst < 0) entry.igst = Math.abs(entry.igst);
      
      await entry.save();
      
      if (entry.itemId) {
        itemsToRebuild.add(entry.itemId.toString());
      }
    }
  }
  
  console.log(`Rebuilding stock for ${itemsToRebuild.size} items...`);
  for (const itemId of Array.from(itemsToRebuild)) {
    await SummaryService.rebuildForItem(itemId);
  }

  console.log('Done fixing entries.');
  process.exit(0);
}

fix();
