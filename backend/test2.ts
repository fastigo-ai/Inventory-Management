import mongoose from 'mongoose';
import { Contractor } from './src/modules/contractors/contractor.schema';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });
console.log(process.env.MONGODB_URI);

const c = new Contractor({
  dynamicData: { companyName: "TEST" }
});
const err = c.validateSync();
console.log(err ? err.message : 'OK');
