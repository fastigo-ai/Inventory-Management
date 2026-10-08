import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/erp').then(async () => {
  const DI = mongoose.connection.collection('dis');
  const dis = await DI.find({ 'lineItems.tempCode': '1' }).toArray();
  
  console.log(`Found ${dis.length} DI documents with Temp Code 1`);
  for (const doc of dis) {
    for (const item of doc.lineItems || []) {
      if (item.tempCode === '1' || item.tempCode === 1) {
        console.log(`DI Doc: ${doc._id}, doc.circle: ${doc.circle}, item.circle: ${item.circle}, item.qty: ${item.quantity}, item.loaSrNo: ${item.loaSrNo || item.loaSerialNo}, item.itemId: ${item.itemId}`);
      }
    }
  }
  process.exit(0);
});
