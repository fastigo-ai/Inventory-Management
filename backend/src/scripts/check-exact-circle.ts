import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

import { ContractorReturn } from '../modules/contractors/contractorReturn.schema';

async function checkExactCircle() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/inventory-management');
    console.log('Connected.');

    const returns = await ContractorReturn.find();
    console.log(`Total returns: ${returns.length}`);
    
    const circleCounts: Record<string, number> = {};
    const locationCounts: Record<string, number> = {};
    
    for (const r of returns) {
      const c = r.circle === undefined ? 'undefined' : `"${r.circle}"`;
      circleCounts[c] = (circleCounts[c] || 0) + 1;
      
      const l = r.location === undefined ? 'undefined' : `"${r.location}"`;
      locationCounts[l] = (locationCounts[l] || 0) + 1;
    }
    
    console.log('Exact Circle values:', circleCounts);
    console.log('Exact Location values:', locationCounts);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkExactCircle();
