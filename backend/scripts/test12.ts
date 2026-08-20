import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { ContractorWorkOrder } from '../src/modules/contractors/contractorWorkOrder.schema';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI as string);
  const wos = await ContractorWorkOrder.find({ "items.loaSrNo": { $in: [2098, "2098"] } });
  console.log("WOs containing loaSrNo 2098:", wos.length);
  process.exit(0);
}
run();
