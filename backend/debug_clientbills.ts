import mongoose from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/erp').then(async () => {
  const ClientBill = mongoose.connection.collection('clientbills');
  const bills = await ClientBill.find({ 'items.tempCode': { $in: ['1', 1] }, status: { $nin: ['Draft', 'Rejected'] } }).toArray();
  
  let csv = 'Bill ID,Bill No,Circle,Bill Type,Stage,Item TempCode,Item Qty\n';
  
  for (const doc of bills) {
    for (const item of doc.items || []) {
      if (item.tempCode === '1' || item.tempCode === 1) {
        csv += `"${doc._id}","${doc.raBillNo}","${doc.circle}","${doc.billType}","${doc.stage}","${item.tempCode}","${item.raBillQty}"\n`;
      }
    }
  }
  
  const desktopPath = path.join(process.env.USERPROFILE || '', 'Desktop', 'ClientBills_TempCode1.csv');
  fs.writeFileSync(desktopPath, csv);
  console.log(`Exported ClientBill data to: ${desktopPath}`);
  
  process.exit(0);
}).catch(console.error);
