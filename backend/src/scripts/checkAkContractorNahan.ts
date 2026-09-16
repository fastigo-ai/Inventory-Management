import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const ContractorAssignmentSchema = new mongoose.Schema({}, { strict: false });
const ContractorAssignment = mongoose.model('ContractorAssignment', ContractorAssignmentSchema, 'contractorassignments');

async function main() {
  await mongoose.connect(process.env.MONGO_URI as string);
  console.log('Connected to MongoDB');

  const ContractorReturnSchema = new mongoose.Schema({}, { strict: false });
  const ContractorReturn = mongoose.model('ContractorReturn', ContractorReturnSchema, 'contractorreturns');
  
  const akAssignments = await ContractorAssignment.find({
    contractorFarmName: { $regex: /A K Contractor/i }
  }).lean();
  console.log(`Assignments for AK Contractor: ${akAssignments.length}`);




  await mongoose.disconnect();
}

main().catch(console.error);
