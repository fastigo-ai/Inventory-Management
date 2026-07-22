import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { StoreInwardEntry } from './src/modules/store/storeInwardEntry.schema';

dotenv.config();

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI as string);
  const entries = await StoreInwardEntry.find({ invoiceNumber: 'PR-00002' });
  console.log(JSON.stringify(entries, null, 2));
  process.exit(0);
}
run();
