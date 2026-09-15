import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { StoreInwardEntry } from '../modules/store/storeInwardEntry.schema';

async function check() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/inventory-management');
  console.log('Connected.');
  
  try {
      const payload = {
        inwardId: 'INW-HIST-1234',
        entryType: 'HISTORICAL',
        status: 'APPROVED',
        vendorName: 'Test',
        invoiceNumber: 'HISTORICAL',
        receivedDate: new Date(),
        unit: 'Nos',
        invoiceQty: 10,
        totalQty: 10,
        challanQty: 10,
        rejectedQty: 0,
        rate: 100,
        amount: 1000,
        taxableAmount: 1000,
        cgst: 0, sgst: 0, igst: 0,
        circle: 'Solan',
        subcircle: 'Nalagarh',
        package: 'Package 1',
        packingList: [{ packType: 'BOX', quantity: 10 }]
      };
      
      const res = await StoreInwardEntry.create([payload]);
      console.log('Inserted:', res[0].inwardId);
  } catch (err: any) {
      console.error('Insert Error:', err);
  }
  
  process.exit(0);
}

check();
