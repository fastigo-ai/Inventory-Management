import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { ContractorAssignment } from '../modules/contractors/contractorAssignment.schema';

async function check() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/inventory-management');
  console.log('Connected.');
  
  const count = await ContractorAssignment.countDocuments();
  console.log(`Remaining MINs: ${count}`);
  
  process.exit(0);
}

check();
