import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { JmcRegister } from '../modules/jmc/jmc.schema';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const checkLastCols = async () => {
  try {
    const MONGO_URI = process.env.MONGO_URI || process.env.DATABASE_URL;
    await mongoose.connect(MONGO_URI as string);
    
    const count = await JmcRegister.countDocuments();
    console.log('Total JMCs:', count);

    // Get the highest jmcNumber
    const highest = await JmcRegister.findOne().sort({ jmcNumber: -1 }).lean();
    console.log('Highest JMC:', highest?.jmcNumber, highest?.location);
    
    // Find missing JMCs by sequence
    const all = await JmcRegister.find().select('jmcNumber').lean();
    const numbers = all.map(j => parseInt(j.jmcNumber.split('/')[2]));
    numbers.sort((a, b) => a - b);
    
    for (let i = 0; i < numbers.length - 1; i++) {
        if (numbers[i+1] - numbers[i] > 1) {
            console.log(`Gap in JMC numbers: missing ${numbers[i]+1} to ${numbers[i+1]-1}`);
        }
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkLastCols();
