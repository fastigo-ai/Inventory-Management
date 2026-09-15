import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

import { ContractorReturn } from '../modules/contractors/contractorReturn.schema';

async function checkReturns() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/inventory-management');
    console.log('Connected.');

    // Check Nahan
    const nahanCount = await ContractorReturn.countDocuments({
      $or: [
        { circle: { $regex: /nahan/i } },
        { location: { $regex: /nahan/i } }
      ]
    });
    console.log(`Returns with circle/location 'nahan': ${nahanCount}`);

    // Check Kumarhatti
    const kumarhattiCount = await ContractorReturn.countDocuments({
      $or: [
        { circle: { $regex: /kumarhatti/i } },
        { location: { $regex: /kumarhatti/i } }
      ]
    });
    console.log(`Returns with circle/location 'kumarhatti': ${kumarhattiCount}`);

    // Check Solan
    const solanCount = await ContractorReturn.countDocuments({
      $or: [
        { circle: { $regex: /solan/i } },
        { location: { $regex: /solan/i } }
      ]
    });
    console.log(`Returns with circle/location 'solan': ${solanCount}`);

    // Total returns
    const totalCount = await ContractorReturn.countDocuments();
    console.log(`Total Returns in system: ${totalCount}`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkReturns();
