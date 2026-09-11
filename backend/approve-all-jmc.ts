import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });
import { JmcRegister } from './src/modules/jmc/jmc.schema';

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/inventory-management');
    console.log('Connected to DB');

    const result = await JmcRegister.updateMany({}, { $set: { status: 'Approved' } });
    console.log(`Successfully updated ${result.modifiedCount} JMC records to Approved status. (Total matched: ${result.matchedCount})`);

  } catch (error) {
    console.error('Error updating JMC status:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
