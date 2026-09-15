import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

import { JmcRegister } from '../modules/jmc/jmc.schema';

const checkIndexes = async () => {
  try {
    const MONGO_URI = process.env.MONGO_URI || process.env.DATABASE_URL;
    if (!MONGO_URI) throw new Error('No MongoDB URI found in environment variables.');

    await mongoose.connect(MONGO_URI);
    
    const indexes = await JmcRegister.collection.indexes();
    console.log('Indexes for JmcRegister:');
    console.log(JSON.stringify(indexes, null, 2));

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkIndexes();
