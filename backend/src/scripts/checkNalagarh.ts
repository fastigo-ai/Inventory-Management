import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../../.env') });
import { ContractorAssignment } from '../modules/contractors/contractorAssignment.schema';

async function check() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/inventory-management');
  
  const total = await ContractorAssignment.countDocuments();
  const nalagarh = await ContractorAssignment.countDocuments({ subcircle: /nalagarh/i });
  const solan = await ContractorAssignment.countDocuments({ circle: /solan/i });
  const ak = await ContractorAssignment.countDocuments({ contractorFarmName: /A K Contractor/i });
  const nalagarhAk = await ContractorAssignment.countDocuments({ subcircle: /nalagarh/i, contractorFarmName: /A K Contractor/i });

  console.log(`Total: ${total}`);
  console.log(`Nalagarh: ${nalagarh}`);
  console.log(`Solan: ${solan}`);
  console.log(`AK: ${ak}`);
  console.log(`Nalagarh + AK: ${nalagarhAk}`);
  
  const allSubcircles = await ContractorAssignment.distinct('subcircle');
  console.log('Subcircles in DB:', allSubcircles);
  
  process.exit(0);
}
check();
