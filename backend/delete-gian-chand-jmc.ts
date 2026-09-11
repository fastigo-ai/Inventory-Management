import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });
import { JmcRegister } from './src/modules/jmc/jmc.schema';

const ContractorSchema = new mongoose.Schema({ name: String, vendorName: String, dynamicData: mongoose.Schema.Types.Mixed }, { strict: false });
const Contractor = mongoose.models.Contractor || mongoose.model('Contractor', ContractorSchema, 'contractors');

async function run() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/inventory-management');
  
  const contractors = await Contractor.find({}).lean();
  const gianChandContractors = contractors.filter(c => {
    const d = c.dynamicData as any || {};
    const name1 = (c.name || '').toLowerCase();
    const name2 = (d.companyName || '').toLowerCase();
    const name3 = (d.displayName || '').toLowerCase();
    const n = name1 + name2 + name3;
    return n.includes('gian') || n.includes('giand');
  });

  if (gianChandContractors.length === 0) {
    console.log("No contractor named 'gian chand' found!");
    process.exit(0);
  }

  const contractorIds = gianChandContractors.map(c => c._id);
  console.log(`Found ${contractorIds.length} matching contractor(s):`);
  gianChandContractors.forEach(c => console.log(`- ID: ${c._id}, Name: ${(c.dynamicData as any)?.companyName}`));

  const result = await JmcRegister.deleteMany({ contractorId: { $in: contractorIds } });
  console.log(`Deleted ${result.deletedCount} JMC documents.`);
  
  process.exit(0);
}

run();
