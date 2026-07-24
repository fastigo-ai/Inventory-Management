import mongoose from 'mongoose';
import { ContractorReturn } from './backend/src/modules/contractors/contractorReturn.schema';

async function test() {
  await mongoose.connect('mongodb://localhost:27017/inventory-management-v2');
  console.log("Connected");
  const returns = await ContractorReturn.find({});
  console.log("Returns:", returns);
  process.exit(0);
}
test().catch(console.error);
