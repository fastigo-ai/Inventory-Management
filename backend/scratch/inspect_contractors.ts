import mongoose from 'mongoose';
import { Contractor } from '../src/modules/contractors/contractor.schema';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/inventory');
    
    const c1 = await Contractor.findById('6a7d942016415816c1cf2e0c').lean();
    console.log("Contractor 1:", c1);

    const c2 = await Contractor.findById('6a646314df84896351d28da4').lean();
    console.log("Contractor 2:", c2);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
