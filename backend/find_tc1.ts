import mongoose from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/erp').then(async () => {
  const ClientBill = mongoose.connection.collection('clientbills');
  const bills = await ClientBill.find({ 'items.tempCode': { $in: ['1', 1] }, status: { $nin: ['Draft', 'Rejected'] } }).toArray();
  
  let total = 0;
  bills.forEach(b => {
    b.items.forEach((i: any) => {
      if (i.tempCode === '1' || i.tempCode === 1) {
        total += (Number(i.raBillQty) || 0);
        console.log(`Bill No: ${b.raBillNo}, Circle: ${b.circle}, Type: ${b.billType}, Stage: ${b.stage}, Qty: ${i.raBillQty}`);
      }
    });
  });
  console.log(`Total raBillQty for Temp Code 1: ${total}`);
  
  process.exit(0);
}).catch(console.error);
