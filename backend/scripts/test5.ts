import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { ContractorWorkOrder } from '../src/modules/contractors/contractorWorkOrder.schema';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI as string);
  const wos = await ContractorWorkOrder.find({ contractorId: "6a6345b98f02b0b289f7ecb6" });
  console.log("Total WOs:", wos.length);
  for (const wo of wos) {
    console.log(`WO: ${wo._id}, package: ${wo.package}, circle: ${wo.circle}, items: ${wo.items.length}`);
    const findItem = wo.items.find((i: any) => String(i.itemId) === "6a7426d44457b533373dd7f3");
    if (findItem) console.log("Found item in WO:", wo._id);
  }
  process.exit(0);
}
run();
