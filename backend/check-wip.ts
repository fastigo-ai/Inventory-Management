import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });
import { WipRegister } from './src/modules/wip/wip.schema';

async function run() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/inventory-management');
  const count = await WipRegister.countDocuments();
  console.log(`Total WIPs: ${count}`);
  if (count > 0) {
    const wips = await WipRegister.find().limit(2).lean();
    console.log(wips);
  }
  process.exit(0);
}
run();
