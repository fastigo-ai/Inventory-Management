import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });
const ContractorSchema = new mongoose.Schema({ name: String, vendorName: String, dynamicData: mongoose.Schema.Types.Mixed }, { strict: false });
const Contractor = mongoose.models.Contractor || mongoose.model('Contractor', ContractorSchema, 'contractors');

async function run() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/inventory-management');
  
  const contractors = await Contractor.find({}).lean();
  contractors.forEach(c => {
    const n = (c.name || (c.dynamicData as any)?.name || c.vendorName || '').toLowerCase();
    if (n.includes('gian') || n.includes('chand') || n.includes('giand')) {
      console.log(`Match: ID: ${c._id}, Name: ${c.name || (c.dynamicData as any)?.name || c.vendorName}`);
    }
  });
  
  process.exit(0);
}
run();
