import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });
import { JmcRegister } from './src/modules/jmc/jmc.schema';

const ContractorSchema = new mongoose.Schema({ name: String, vendorName: String, dynamicData: mongoose.Schema.Types.Mixed }, { strict: false });
const Contractor = mongoose.models.Contractor || mongoose.model('Contractor', ContractorSchema, 'contractors');

async function run() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/inventory-management');
  
  const jmcs = await JmcRegister.find({}).populate('contractorId', 'name vendorName dynamicData').lean();
  let count = 0;
  
  for (const jmc of jmcs) {
    const c = jmc.contractorId as any;
    if (c) {
      const n = (c.name || (c.dynamicData as any)?.name || c.vendorName || '').toLowerCase();
      if (n.includes('gian') || n.includes('chand') || n.includes('giand')) {
        console.log(`Match: JMC ID: ${jmc._id}, Contractor: ${n}`);
        count++;
        await JmcRegister.deleteOne({ _id: jmc._id });
      }
    }
  }
  
  console.log(`Deleted ${count} JMC entries.`);
  process.exit(0);
}

run();
