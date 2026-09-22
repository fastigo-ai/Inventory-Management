import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: __dirname + '/../.env' });

import { ContractorAssignment } from '../src/modules/contractors/contractorAssignment.schema';
import { WipRegister } from "../src/modules/wip/wip.schema";
import { JmcRegister } from "../src/modules/jmc/jmc.schema";

async function test() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log("Connected to MongoDB.");

  const id = "6a9e6de5ad2b676ebd2afa3f";

  try {
    const [assignments, wipRecords, jmcRecords] = await Promise.all([
      ContractorAssignment.find({ contractorId: id, status: 'Sent' }).lean(),
      WipRegister.find({ contractorId: id, status: { $ne: 'Rejected' } }).lean(),
      JmcRegister.find({ contractorId: id, status: { $ne: 'Rejected' } }).lean()
    ]);
    console.log("Success");
  } catch (err) {
    console.error("Error:", err);
  }
  process.exit(0);
}

test();
