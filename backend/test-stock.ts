import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { buildStockSummaryData } from './src/modules/store/store.controller';

dotenv.config({ path: './.env' });

async function run() {
  await mongoose.connect(process.env.MONGO_URI as string);
  
  const data = await buildStockSummaryData('Nahan');
  
  console.log("=== NAHAN STOCK SUMMARY ===");
  data.filter(s => s.tempCode === "1" || s.tempCode === "7" || s.tempCode === "20" || s.tempCode === "127" || s.tempCode === "83" || s.totalBalanceQty > 0 || s.contractorsIssuedQty > 0 || s.contractorsReturnQty > 0 || s.receivedFromOtherStore > 0 || s.transferToOtherStore > 0).forEach(s => {
    console.log(`\nItem: ${s.description} (TempCode: ${s.tempCode})`);
    console.log(`  + Accepted Inwards: ${s.acceptedQty} (Received: ${s.receivedQty}, Rejected: ${s.rejectedQty})`);
    console.log(`  + Received from Stores: ${s.receivedFromOtherStore}`);
    console.log(`  - Transferred Out: ${s.transferToOtherStore}`);
    console.log(`  - Issued to Contractors: ${s.contractorsIssuedQty}`);
    console.log(`  + Returned from Contractors: ${s.contractorsReturnQty}`);
    console.log(`  = Final Balance Qty: ${s.totalBalanceQty}`);
  });
  
  process.exit(0);
}
run().catch(console.error);
