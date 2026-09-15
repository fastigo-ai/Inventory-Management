import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

import { JmcRegister } from '../modules/jmc/jmc.schema';

const deleteNahanJmcs = async () => {
  try {
    const MONGO_URI = process.env.MONGO_URI || process.env.DATABASE_URL;
    if (!MONGO_URI) throw new Error('No MongoDB URI found in environment variables.');

    await mongoose.connect(MONGO_URI);
    console.log(`Connected to DB`);

    const result = await JmcRegister.deleteMany({ circle: /nahan/i });
    console.log(`Successfully deleted ${result.deletedCount} JMCs for Nahan circle.`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error deleting Nahan JMCs:', error);
    process.exit(1);
  }
};

deleteNahanJmcs();
