import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../.env') });

import mongoose from 'mongoose';
import connectDB from '../src/core/database';
import { JmcRegister } from '../src/modules/jmc/jmc.schema';

async function main() {
  try {
    await connectDB();
    console.log('Connected to DB');

    const result = await JmcRegister.deleteOne({ jmcNumber: 'JMC/26/1545' });
    if (result.deletedCount > 0) {
      console.log('Successfully deleted JMC/26/1545');
    } else {
      console.log('JMC/26/1545 not found or already deleted.');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from DB');
  }
}

main();
