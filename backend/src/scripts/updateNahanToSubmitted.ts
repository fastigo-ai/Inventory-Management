import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { JmcRegister } from '../modules/jmc/jmc.schema';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const updateNahanJmcStatus = async () => {
  try {
    const MONGO_URI = process.env.MONGO_URI || process.env.DATABASE_URL;
    if (!MONGO_URI) {
      throw new Error('MONGO_URI is missing');
    }
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Check before counts
    const beforeCounts = await JmcRegister.aggregate([
      { $match: { circle: /nahan/i } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    console.log('Before update counts for Nahan:', JSON.stringify(beforeCounts, null, 2));

    // Update all Nahan JMCs to Submitted
    const result = await JmcRegister.updateMany(
      { circle: /nahan/i },
      { $set: { status: 'Submitted' } }
    );
    console.log(`Updated ${result.modifiedCount} of matched ${result.matchedCount} JMC documents to 'Submitted'`);

    // Check after counts
    const afterCounts = await JmcRegister.aggregate([
      { $match: { circle: /nahan/i } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    console.log('After update counts for Nahan:', JSON.stringify(afterCounts, null, 2));

    process.exit(0);
  } catch (error) {
    console.error('Update error:', error);
    process.exit(1);
  }
};

updateNahanJmcStatus();
