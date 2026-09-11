import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const ContractorSchema = new mongoose.Schema({ name: String, vendorName: String, dynamicData: mongoose.Schema.Types.Mixed }, { strict: false });
const Contractor = mongoose.models.Contractor || mongoose.model('Contractor', ContractorSchema, 'contractors');

async function run() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/inventory-management');
  
  const contractors = await Contractor.find({
    $or: [
      { name: { $regex: /giand/i } },
      { 'dynamicData.name': { $regex: /giand/i } },
      { vendorName: { $regex: /giand/i } },
      { name: { $regex: /gian/i } },
      { 'dynamicData.name': { $regex: /gian/i } }
    ]
  }).lean();
  
  console.log("Found Contractors:", contractors.map(c => ({ _id: c._id, name: c.name || (c.dynamicData as any)?.name })));
  
  process.exit(0);
}

run();
