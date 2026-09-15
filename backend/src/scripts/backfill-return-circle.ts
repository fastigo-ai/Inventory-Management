import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

import { ContractorReturn } from '../modules/contractors/contractorReturn.schema';
import User from '../modules/users/user.model';

async function backfillCircle() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/inventory-management');
    console.log('Connected.');

    const returnsWithoutCircle = await ContractorReturn.find({ $or: [{ circle: { $exists: false } }, { circle: '' }] });
    console.log(`Found ${returnsWithoutCircle.length} returns without circle.`);

    let count = 0;
    for (const ret of returnsWithoutCircle) {
      if (ret.createdBy) {
        const user = await User.findById(ret.createdBy);
        if (user && user.assignedCircle) {
          ret.circle = user.assignedCircle;
        } else {
          ret.circle = 'Kumarhatti';
        }
      } else {
        ret.circle = 'Kumarhatti'; // Default for the recent buggy uploads
      }
      await ret.save();
      count++;
    }

    console.log(`Successfully backfilled circle for ${count} returns.`);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

backfillCircle();
