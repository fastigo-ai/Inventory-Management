import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Pr } from './src/modules/purchases/pr.schema';

dotenv.config();

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI as string);
  const pr = await Pr.findOne({ purchaseReceiveNumber: 'PR-00002' });
  console.log(JSON.stringify(pr?.lineItems, null, 2));
  process.exit(0);
}
run();
