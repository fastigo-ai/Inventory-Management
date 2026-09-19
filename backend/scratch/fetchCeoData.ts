import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { buildCeoDashboardSummary } from '../src/modules/dashboard/ceoDashboard.service';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/erp-system');
  console.log('Connected to DB');

  const data = await buildCeoDashboardSummary({});
  console.log('physicalStockProgress:', JSON.stringify(data.charts.physicalStockProgress, null, 2));

  await mongoose.disconnect();
}

run().catch(console.error);
