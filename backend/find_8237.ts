import mongoose from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/erp').then(async () => {
  const ClientBill = mongoose.connection.collection('clientbills');
  const bills = await ClientBill.find({ 'items.raBillQty': 8237 }).toArray();
  
  console.log(`Found ${bills.length} bills with 8,237 qty`);
  bills.forEach(b => {
    console.log(`Bill No: ${b.raBillNo}, Circle: ${b.circle}, Type: ${b.billType}, Stage: ${b.stage}`);
    b.items.forEach((i: any) => {
      if (i.raBillQty === 8237) {
        console.log(`  -> Item Name: ${i.itemName}, TempCode: ${i.tempCode}, LOA: ${i.loaSrNo}`);
      }
    });
  });
  
  process.exit(0);
}).catch(console.error);
