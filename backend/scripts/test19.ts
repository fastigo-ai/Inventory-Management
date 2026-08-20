import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { ContractorAssignment } from '../src/modules/contractors/contractorAssignment.schema';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI as string);
  const ca = await ContractorAssignment.findOne({ contractorId: "6a6345b98f02b0b289f7ecb6" });
  console.log("Assignment package:", `"${ca?.package}"`);
  console.log("First item:", ca?.lineItems[0]);
  process.exit(0);
}
run();
