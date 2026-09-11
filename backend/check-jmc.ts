import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });
import { JmcRegister } from './src/modules/jmc/jmc.schema';

const ContractorSchema = new mongoose.Schema({ name: String, vendorName: String, dynamicData: mongoose.Schema.Types.Mixed }, { strict: false });
const Contractor = mongoose.models.Contractor || mongoose.model('Contractor', ContractorSchema, 'contractors');

async function run() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/inventory-management');
  
  const jmcs = await JmcRegister.find({}).lean();
  console.log(`Total JMCs: ${jmcs.length}`);
  if (jmcs.length > 0) {
    console.log(`First JMC: contractorId=${jmcs[0].contractorId}`);
    const c = await Contractor.findById(jmcs[0].contractorId).lean();
    console.log(`First Contractor:`, c);
  }
  
  process.exit(0);
}

run();
