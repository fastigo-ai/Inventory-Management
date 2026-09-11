import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });
import StoreInwardEntry from './src/modules/store/inward/inward.model';

async function run() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/inventory-management');
  
  const inwards = await StoreInwardEntry.find({
    circle: { $regex: /nahan/i },
    tempCode: { $in: ['93', 93] }
  }).lean();
  
  console.log(`Found ${inwards.length} inwards for Temp Code 93 in Nahan`);
  if (inwards.length > 0) {
    console.log(inwards);
  }
  
  process.exit(0);
}

run();
