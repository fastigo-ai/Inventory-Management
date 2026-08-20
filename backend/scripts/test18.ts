import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { ContractorWorkOrder } from '../src/modules/contractors/contractorWorkOrder.schema';
import { JmcRegister } from '../src/modules/jmc/jmc.schema';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI as string);
  const wo = await ContractorWorkOrder.findOne({ contractorId: "6a6345b98f02b0b289f7ecb6" });
  console.log("WO package:", `"${wo?.package}"`);

  const jmc = await JmcRegister.findOne({ contractorId: "6a6345b98f02b0b289f7ecb6" });
  console.log("JMC package:", `"${jmc?.package}"`);
  
  process.exit(0);
}
run();
