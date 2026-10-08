import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/erp').then(async () => {
  const ClientBill = mongoose.connection.collection('clientbills');
  const bills = await ClientBill.find({ 'items.tempCode': { $in: ['1', 1] }, status: { $nin: ['Draft', 'Rejected'] } }).toArray();
  
  let total60 = 0;
  bills.forEach(b => {
    b.items.forEach((i: any) => {
      if ((i.tempCode === '1' || i.tempCode === 1) && b.billType === 'Supply' && b.stage === '60%') {
        total60 += (Number(i.raBillQty) || 0);
      }
    });
  });
  console.log(`Total Supply Bill 60% qty for ALL Circles Temp Code 1: ${total60}`);
  
  process.exit(0);
}).catch(console.error);
