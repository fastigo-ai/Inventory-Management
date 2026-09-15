import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

import { ContractorReturn } from '../modules/contractors/contractorReturn.schema';

async function checkContractorName() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/inventory-management');
    console.log('Connected.');

    const returns = await ContractorReturn.find({ circle: 'Kumarhatti' });
    const nameCounts: Record<string, number> = {};
    
    for (const r of returns) {
      const n = r.contractorFarmName || 'undefined';
      nameCounts[n] = (nameCounts[n] || 0) + 1;
    }
    
    console.log('Contractor Farm Names in Kumarhatti returns:', nameCounts);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkContractorName();
