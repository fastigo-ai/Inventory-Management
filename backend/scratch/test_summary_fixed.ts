import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load .env explicitly
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { ContractorAssignment } from '../src/modules/contractors/contractorAssignment.schema';
import { WipRegister } from "../src/modules/wip/wip.schema";
import { JmcRegister } from "../src/modules/jmc/jmc.schema";

async function test() {
  if (!process.env.MONGODB_URI) {
    console.error("No MONGODB_URI found!");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB.");

  const id = "6a9e6de5ad2b676ebd2afa3f";

  try {
    const [assignments, wipRecords, jmcRecords] = await Promise.all([
      ContractorAssignment.find({ contractorId: id, status: 'Sent' }).lean(),
      WipRegister.find({ contractorId: id, status: { $ne: 'Rejected' } }).lean(),
      JmcRegister.find({ contractorId: id, status: { $ne: 'Rejected' } }).lean()
    ]);
    console.log("Found assignments:", assignments.length);
    console.log("Found WIP:", wipRecords.length);
    console.log("Found JMC:", jmcRecords.length);
  } catch (err) {
    console.error("Error executing queries:", err);
  }
  process.exit(0);
}

test();
