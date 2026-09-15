import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

import { ContractorReturn } from '../modules/contractors/contractorReturn.schema';

async function checkNahanData() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/inventory-management');
    console.log('Connected.');

    const nahanReturns = await ContractorReturn.find({
      circle: { $regex: /kumarhatti/i },
      $or: [
        { location: { $regex: /nahan/i } },
        { division: { $regex: /nahan/i } },
        { subDivision: { $regex: /nahan/i } },
        { subStation: { $regex: /nahan/i } },
        { remarks: { $regex: /nahan/i } }
      ]
    });

    console.log(`Found ${nahanReturns.length} returns that look like they belong to Nahan but are assigned to Kumarhatti.`);

    if (nahanReturns.length > 0) {
      console.log('Sample return division/subdivision:');
      console.log({
        challanNo: nahanReturns[0].returnChallanNo,
        location: nahanReturns[0].location,
        division: nahanReturns[0].division,
        subDivision: nahanReturns[0].subDivision,
        subStation: nahanReturns[0].subStation
      });

      console.log('Moving these records to Nahan...');
      
      let updatedCount = 0;
      for (const ret of nahanReturns) {
        ret.circle = 'Nahan';
        await ret.save();
        updatedCount++;
      }
      
      console.log(`Successfully moved ${updatedCount} records to Nahan.`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkNahanData();
