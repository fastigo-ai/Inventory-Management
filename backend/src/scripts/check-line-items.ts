import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

import { ContractorReturn } from '../modules/contractors/contractorReturn.schema';

async function checkLineItems() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/inventory-management');
    console.log('Connected.');

    const returns = await ContractorReturn.find();
    let totalLineItems = 0;
    
    returns.forEach(ret => {
      if (ret.lineItems) {
        totalLineItems += ret.lineItems.length;
      }
    });

    console.log(`Total Returns (Challans): ${returns.length}`);
    console.log(`Total Line Items across all returns: ${totalLineItems}`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkLineItems();
