import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import xlsx from 'xlsx';
import { JmcRegister } from '../modules/jmc/jmc.schema';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const testValidation = async () => {
  try {
    const MONGO_URI = process.env.MONGO_URI || process.env.DATABASE_URL;
    await mongoose.connect(MONGO_URI as string);
    
    const jmcs = await JmcRegister.find({ circle: /nahan/i }).lean();
    console.log(`Found ${jmcs.length} JMCs.`);
    
    // Check if subStation is correctly populated
    const missingSubStn = jmcs.filter(j => !j.subStation);
    console.log(`JMCs with NO subStation: ${missingSubStn.length}`);
    
    const hasFeeder = jmcs.filter(j => j.feeder);
    console.log(`JMCs WITH feeder: ${hasFeeder.length}`);

    // Print a sample of 5 JMCs
    for (let i = 0; i < 5; i++) {
        console.log(`JMC ${i}: loc=${jmcs[i]?.location}, subStn=${jmcs[i]?.subStation}, feeder=${jmcs[i]?.feeder}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

testValidation();
