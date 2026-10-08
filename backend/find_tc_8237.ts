import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/erp').then(async () => {
  const ClientBill = mongoose.connection.collection('clientbills');
  const Jmc = mongoose.connection.collection('jmcworks'); // Wait, is it jmcworks? In summary.controller.ts it's jmcs.
  
  // Just find the client bills that have stage 60% and group by temp code
  const bills = await ClientBill.find({ billType: 'Supply', stage: '60%', status: { $nin: ['Draft', 'Rejected'] } }).toArray();
  
  const tempCodeMap: Record<string, number> = {};
  
  bills.forEach(b => {
    b.items.forEach((i: any) => {
      if (i.tempCode) {
        tempCodeMap[i.tempCode] = (tempCodeMap[i.tempCode] || 0) + (Number(i.raBillQty) || 0);
      }
    });
  });
  
  for (const [tc, qty] of Object.entries(tempCodeMap)) {
    if (qty >= 8000 && qty <= 8500) {
      console.log(`Temp Code ${tc} has Supply Bill 60% total of ${qty}`);
    }
  }
  
  process.exit(0);
}).catch(console.error);
