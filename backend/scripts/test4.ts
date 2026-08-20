import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { ContractorWorkOrder } from '../src/modules/contractors/contractorWorkOrder.schema';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI as string);
  const wo = await ContractorWorkOrder.findOne({ contractorId: "6a6345b98f02b0b289f7ecb6" });
  if (wo) {
    console.log("Min and max loaSrNo:");
    const loas = wo.items.map((i: any) => Number(i.loaSrNo)).filter((x: any) => !isNaN(x));
    console.log(Math.min(...loas), Math.max(...loas));
    const findItem = wo.items.find((i: any) => String(i.itemId) === "6a7426d44457b533373dd7f3");
    console.log("Matching item ID:", findItem ? `Found with loaSrNo: ${findItem.loaSrNo}, activity: ${findItem.activity}` : "Not found");
  }
  process.exit(0);
}
run();
