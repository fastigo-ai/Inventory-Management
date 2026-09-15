import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { JmcRegister } from '../modules/jmc/jmc.schema';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const checkFatJmcs = async () => {
  try {
    const MONGO_URI = process.env.MONGO_URI || process.env.DATABASE_URL;
    await mongoose.connect(MONGO_URI as string);
    
    const dbJmcs = await JmcRegister.find({ circle: /nahan/i }).lean();
    
    for (const jmc of dbJmcs) {
      if (jmc.items.length > 50) { // arbitrary threshold
        console.log(`FAT JMC: ${jmc.jmcNumber} | Loc: ${jmc.location} | Sub: ${jmc.subStation} | Pkg: ${jmc.package} | Items: ${jmc.items.length}`);
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkFatJmcs();
