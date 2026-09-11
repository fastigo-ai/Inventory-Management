import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });
import { WipRequiredRegister } from './src/modules/wip-required/wipRequired.schema';
import { WipRegister } from './src/modules/wip/wip.schema';

async function run() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/inventory-management');
  console.log('WipReqs:', await WipRequiredRegister.countDocuments());
  console.log('Wips:', await WipRegister.countDocuments());
  process.exit(0);
}
run();
