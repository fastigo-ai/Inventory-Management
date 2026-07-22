import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Pr } from './src/modules/purchases/pr.schema';

dotenv.config();

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI as string);
  const prs = await Pr.find({ purchaseReceiveNumber: 'PR-00002' });
  for (const pr of prs) {
    const item = pr.lineItems?.[0] as any;
    console.log("item.cgst =", item.cgst, "item.sgst =", item.sgst);
  }
  process.exit(0);
}
run();
