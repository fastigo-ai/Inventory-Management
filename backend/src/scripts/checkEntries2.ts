import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { StoreInwardEntry } from '../modules/store/storeInwardEntry.schema';

async function check() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/inventory-management');
  console.log('Connected.');
  
  const entries = await StoreInwardEntry.find().sort({ createdAt: -1 }).limit(5).lean();
  for (const e of entries) {
    console.log(`InwardId: ${e.inwardId}, EntryType: ${e.entryType}, Invoice: ${e.invoiceNumber}, Status: ${e.status}, Circle: ${e.circle}, Subcircle: ${e.subcircle}`);
  }
  
  process.exit(0);
}

check();
