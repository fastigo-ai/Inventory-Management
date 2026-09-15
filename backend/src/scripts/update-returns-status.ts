import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

import { ContractorReturn } from '../modules/contractors/contractorReturn.schema';

async function updateStatus() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/inventory-management');
    console.log('Connected.');

    const result = await ContractorReturn.updateMany(
      { circle: { $in: [/^nahan$/i, /^kumarhatti$/i] } },
      { $set: { status: 'Approved' } }
    );

    console.log(`Successfully updated ${result.modifiedCount} records to 'Approved' status.`);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

updateStatus();
