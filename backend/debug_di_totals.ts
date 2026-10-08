import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/erp').then(async () => {
  const DI = mongoose.connection.collection('dis');
  const dis = await DI.find({ 'lineItems.tempCode': { $in: ['1', 1] }, status: { $ne: 'Cancelled' } }).toArray();
  
  const circleTotals: Record<string, number> = {
    solan: 0, nahan: 0, rampur: 0, rohru: 0, unknown: 0
  };
  
  for (const doc of dis) {
    const docCirc = (doc.circle || '').toLowerCase();
    for (const item of doc.lineItems || []) {
      if (item.tempCode === '1' || item.tempCode === 1) {
        const lineCirc = (item.circle || docCirc || '').toLowerCase();
        let target = 'unknown';
        if (lineCirc.includes('solan')) target = 'solan';
        else if (lineCirc.includes('nahan')) target = 'nahan';
        else if (lineCirc.includes('rampur')) target = 'rampur';
        else if (lineCirc.includes('rohru')) target = 'rohru';
        
        circleTotals[target] += Number(item.quantity || 0);
      }
    }
  }
  
  console.log('--- TOTAL DI DONE QTY FOR TEMP CODE 1 BY CIRCLE ---');
  console.log(`Solan:  ${circleTotals.solan.toLocaleString('en-IN')}`);
  console.log(`Nahan:  ${circleTotals.nahan.toLocaleString('en-IN')}`);
  console.log(`Rampur: ${circleTotals.rampur.toLocaleString('en-IN')}`);
  console.log(`Rohru:  ${circleTotals.rohru.toLocaleString('en-IN')}`);
  console.log(`Unknown: ${circleTotals.unknown.toLocaleString('en-IN')}`);
  
  process.exit(0);
}).catch(console.error);
