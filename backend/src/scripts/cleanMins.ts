import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { ContractorAssignment } from '../modules/contractors/contractorAssignment.schema';

async function check() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/inventory-management');
  console.log('Connected.');
  
  const res = await ContractorAssignment.deleteMany({ subcircle: { $exists: false } });
  console.log(`Deleted ${res.deletedCount} broken MINs lacking a subcircle`);
  
  process.exit(0);
}

check();
