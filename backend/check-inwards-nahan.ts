import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });
import { StoreInwardEntry } from './src/modules/store/storeInwardEntry.schema';

async function run() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/inventory-management');
  
  const inwards = await StoreInwardEntry.find({ circle: { $regex: /nahan/i } }).lean();
  let foundCount = 0;
  console.log(`Found ${inwards.length} total Inward Entries for Nahan.`);
  
  for (const inward of inwards) {
    if (inward.tempCode === '93' || inward.description?.toLowerCase().includes('earth wire')) {
      console.log(`Match found! ID: ${inward._id}, TempCode: ${inward.tempCode}, Status: ${inward.status}, Description: ${inward.description}, InvQty: ${inward.invoiceQty}`);
      foundCount++;
    }
  }
  
  if (foundCount === 0) {
    console.log("No inwards found for GI earth wire in Nahan.");
  }
  
  process.exit(0);
}

run();
