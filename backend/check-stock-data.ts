import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });
import { buildStockSummaryData } from './src/modules/store/store.controller';

async function run() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/inventory-management');
  
  const summary = await buildStockSummaryData('Nahan');
  const item93 = summary.find((s: any) => s.tempCode === '93' || s.tempCode === 93);
  console.log("ITEM 93 SUMMARY:", JSON.stringify(item93, null, 2));
  
  process.exit(0);
}

run();
