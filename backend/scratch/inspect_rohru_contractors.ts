import mongoose from 'mongoose';
import { JmcRegister } from '../src/modules/jmc/jmc.schema';
import { WipRegister } from '../src/modules/wip/wip.schema';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/inventory');
    
    const jmcs = await JmcRegister.find({ circle: { $regex: /rohru/i } }).limit(5).lean();
    console.log("JMC Records for Rohru (Sample):");
    jmcs.forEach((j: any) => {
      console.log(`- ID: ${j._id}, JMC No: ${j.jmcNumber}, Contractor ID: ${j.contractorId}, Remarks: ${j.remarks}`);
    });

    const wips = await WipRegister.find({ circle: { $regex: /rohru/i } }).limit(5).lean();
    console.log("\nWIP Consumed for Rohru (Sample):");
    wips.forEach((w: any) => {
      console.log(`- ID: ${w._id}, WIP No: ${w.wipNumber}, Contractor ID: ${w.contractorId}, Remarks: ${w.remarks}`);
    });

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
