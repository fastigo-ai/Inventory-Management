import mongoose from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/erp').then(async () => {
  const DI = mongoose.connection.collection('dis');
  const dis = await DI.find({ 'lineItems.tempCode': { $in: ['1', 1] }, status: { $ne: 'Cancelled' } }).toArray();
  
  let csv = 'DI Document ID,Document Circle,Item Circle,Temp Code,Item ID,LOA Serial No,Quantity,Date Created\n';
  
  for (const doc of dis) {
    const docCirc = (doc.circle || '').toLowerCase();
    for (const item of doc.lineItems || []) {
      if (item.tempCode === '1' || item.tempCode === 1) {
        const lineCirc = item.circle || docCirc || 'none';
        const loaSr = item.loaSrNo || item.loaSerialNo || 'none';
        csv += `"${doc._id}","${docCirc}","${item.circle || ''}","${item.tempCode}","${item.itemId}","${loaSr}","${item.quantity}","${doc.createdAt || doc.date || ''}"\n`;
      }
    }
  }
  
  const desktopPath = path.join(process.env.USERPROFILE || '', 'Desktop', 'TempCode1_DI_Export.csv');
  fs.writeFileSync(desktopPath, csv);
  console.log(`Exported DI data to: ${desktopPath}`);
  
  process.exit(0);
}).catch(console.error);
