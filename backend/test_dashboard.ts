import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { buildCeoDashboardSummary } from './src/modules/dashboard/ceoDashboard.service';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI as string);
  try {
    const data = await buildCeoDashboardSummary({});
    console.log("Success", Object.keys(data));
  } catch (err) {
    console.error("Error executing buildCeoDashboardSummary:", err);
  }
  process.exit(0);
}
run();
