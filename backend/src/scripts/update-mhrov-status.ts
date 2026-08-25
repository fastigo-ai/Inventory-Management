import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../../.env') });
import { Mhrov } from '../modules/store/mhrov.schema';

async function run() {
  await mongoose.connect(process.env.MONGO_URI as string);
  console.log('Connected to DB');
  
  const result = await Mhrov.updateMany({}, { $set: { status: 'DONE' } });
  console.log('Updated ' + result.modifiedCount + ' MHROVs to DONE');
  
  process.exit(0);
}
run();
