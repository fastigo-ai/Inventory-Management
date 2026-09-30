import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import { buildStockSummaryData } from '../src/modules/store/inward.controller';

async function run() {
  await mongoose.connect(process.env.MONGO_URI as string);
  const summary = await buildStockSummaryData(undefined, undefined, undefined);
  const item69 = summary.find((s: any) => String(s.tempCode) === '69');
  console.log('Item 69 from buildStockSummaryData:', item69);
  process.exit(0);
}
run();
