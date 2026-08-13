import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { StoreInwardEntry } from './src/modules/store/storeInwardEntry.schema';

dotenv.config({ path: 'c:/Users/sanjeet kumar/Desktop/DoortwoFy/erp-system/backend/.env' });

const MONGO_URI = process.env.MONGO_URI as string;

async function checkEntry() {
  try {
    await mongoose.connect(MONGO_URI);
    
    const entries = await StoreInwardEntry.find({ invoiceNumber: 'INV-01118' });
    console.log(`Found ${entries.length} entries for INV-01118`);
    
    for (const entry of entries) {
       console.log(`Fixing INV-01118: totalQty is currently ${entry.totalQty}`);
       if (entry.totalQty === -7 || entry.totalQty === -8) {
           entry.totalQty = 7; // Just set it to 7 or 8 for testing to fix the negative
           await entry.save();
           console.log("Updated to", entry.totalQty);
       }
    }
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

checkEntry();
