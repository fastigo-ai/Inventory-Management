import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load .env explicitly
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { ContractorAssignment } from '../src/modules/contractors/contractorAssignment.schema';
import { WipRegister } from "../src/modules/wip/wip.schema";
import { JmcRegister } from "../src/modules/jmc/jmc.schema";

async function test() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log("Connected to MongoDB.");

  const id = "6a9e6de5ad2b676ebd2afa3f";

  const [assignments, wipRecords, jmcRecords] = await Promise.all([
    ContractorAssignment.find({ contractorId: id, status: 'Sent' }).lean(),
    WipRegister.find({ contractorId: id, status: { $ne: 'Rejected' } }).lean(),
    JmcRegister.find({ contractorId: id, status: { $ne: 'Rejected' } }).lean()
  ]);

  const map: any = {};
  const getKey = (tempCode: any, activity: any, loaSrNo: any) => {
    return `${String(tempCode || '').trim().toLowerCase()}_${String(activity || '').trim().toLowerCase()}_${String(loaSrNo || '').trim().toLowerCase()}`;
  };

  assignments.forEach(assignment => {
    assignment.lineItems?.forEach((item: any) => {
      const key = getKey(item.tempCode, item.activity, item.loaSrNo || item.loaSerialNo);
      if (!map[key]) map[key] = { tillIssued: 0, wipConsumed: 0, jmcDone: 0 };
      map[key].tillIssued += (Number(item.quantity) || 0);
    });
  });
  
  console.log("Keys in map:", Object.keys(map));

  process.exit(0);
}

test();
