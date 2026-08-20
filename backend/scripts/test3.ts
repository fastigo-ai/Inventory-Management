import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { ContractorWorkOrder } from '../src/modules/contractors/contractorWorkOrder.schema';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI as string);
  const wo = await ContractorWorkOrder.findOne({ contractorId: "6a6345b98f02b0b289f7ecb6" });
  if (wo) {
    const matches = wo.items.filter((i: any) => String(i.loaSrNo) === "2098" || String(i.loaSrNo) === "2099");
    console.log("Found in WO:", matches.map((i: any) => ({ itemId: i.itemId, loaSrNo: i.loaSrNo, tempCode: i.tempCode })));
  }
  process.exit(0);
}
run();
