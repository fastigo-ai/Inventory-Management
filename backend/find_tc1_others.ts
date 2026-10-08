import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/erp').then(async () => {
  const ClientBill = mongoose.connection.collection('clientbills');
  const bills = await ClientBill.find({ 'items.tempCode': { $in: ['1', 1] }, status: { $nin: ['Draft', 'Rejected'] } }).toArray();
  
  let solanTotal = 0;
  let nahanTotal = 0;
  let rampurTotal = 0;
  bills.forEach(b => {
    b.items.forEach((i: any) => {
      if ((i.tempCode === '1' || i.tempCode === 1) && b.billType === 'Supply' && b.stage === '60%') {
        const c = (b.circle || '').toLowerCase();
        if (c === 'solan') solanTotal += (Number(i.raBillQty) || 0);
        if (c === 'nahan') nahanTotal += (Number(i.raBillQty) || 0);
        if (c === 'rampur') rampurTotal += (Number(i.raBillQty) || 0);
      }
    });
  });
  console.log(`Solan: ${solanTotal}, Nahan: ${nahanTotal}, Rampur: ${rampurTotal}`);
  
  process.exit(0);
}).catch(console.error);
