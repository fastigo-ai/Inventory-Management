import mongoose from 'mongoose';
import { getDetailedStockSummary } from './src/modules/reports/summary/summary.service';
import * as dotenv from 'dotenv';
dotenv.config({ path: './.env' });

async function main() {
  await mongoose.connect(process.env.MONGO_URI as string);
  console.log('Connected to DB');

  try {
    const summary = await getDetailedStockSummary({ circle: 'Nahan', contractorName: 'Gian Chand Contractor' });
    const rabbit = summary.find((s: any) => s.loaSrNo === '1331' || s.description?.includes('RABBIT'));
    console.log(JSON.stringify(rabbit, null, 2));
  } catch (e) {
    console.error(e);
  }

  mongoose.disconnect();
}
main();
