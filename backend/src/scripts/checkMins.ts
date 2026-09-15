import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { ContractorAssignment } from '../modules/contractors/contractorAssignment.schema';

async function check() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/inventory-management');
  console.log('Connected.');
  
  const entries = await ContractorAssignment.find().sort({ createdAt: -1 }).limit(5).lean();
  for (const e of entries) {
    console.log(`MIN: ${e.assignmentNumber}, Circle: "${e.circle}", Subcircle: "${e.subcircle}", Package: "${e.package}"`);
  }
  
  const kumarhattiEntries = await ContractorAssignment.countDocuments({ subcircle: /kumarhatti/i });
  console.log(`Total MINs with subcircle Kumarhatti: ${kumarhattiEntries}`);
  
  process.exit(0);
}

check();
