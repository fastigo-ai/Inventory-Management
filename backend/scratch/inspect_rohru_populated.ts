import mongoose from 'mongoose';
import { JmcRegister } from '../src/modules/jmc/jmc.schema';
import { Contractor } from '../src/modules/contractors/contractor.schema';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/inventory');
    
    const jmcs = await JmcRegister.find({ circle: { $regex: /rohru/i } })
      .populate('contractorId', 'name vendorName dynamicData')
      .limit(5)
      .lean();
    console.log("Populated JMC Records for Rohru:");
    console.log(JSON.stringify(jmcs, null, 2));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
