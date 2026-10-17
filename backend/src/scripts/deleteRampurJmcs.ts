import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { JmcRegister } from '../modules/jmc/jmc.schema';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const deleteRampurJmcs = async () => {
  try {
    const MONGO_URI = process.env.MONGO_URI || process.env.DATABASE_URL;
    if (!MONGO_URI) throw new Error('No MongoDB URI found in environment variables.');

    await mongoose.connect(MONGO_URI);
    console.log('Connected to DB');

    const rampurRegex = /rampur/i;
    const countBefore = await JmcRegister.countDocuments({ circle: rampurRegex });
    console.log(`Found ${countBefore} JMC documents for Rampur circle.`);

    const result = await JmcRegister.deleteMany({ circle: rampurRegex });
    console.log(`Successfully deleted ${result.deletedCount} JMC documents for Rampur circle.`);

    process.exit(0);
  } catch (error) {
    console.error('Error deleting Rampur JMCs:', error);
    process.exit(1);
  }
};

deleteRampurJmcs();
