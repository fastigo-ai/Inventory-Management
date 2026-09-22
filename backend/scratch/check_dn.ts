import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load .env explicitly
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { DemandNote } from '../src/modules/demand-notes/demandNote.schema';

async function test() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log("Connected to MongoDB.");

  const dn = await DemandNote.findOne({ demandNoteId: "DN-2609-0017" }).lean();
  console.log("Contractor:", dn?.contractor);
  console.log("ContractorName:", dn?.contractorName);
  console.log("Circle:", dn?.circle);
  
  process.exit(0);
}

test();
