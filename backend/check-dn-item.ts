import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });
import WipRequiredRegister from './src/modules/wip-required/wipRequired.model';

async function run() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/inventory-management');
  
  const dn = await WipRequiredRegister.findOne({ 'items.tempCode': { $in: ['93', 93] } }).lean();
  if (dn) {
    const item = dn.items.find((i: any) => i.tempCode == '93');
    console.log("ITEM DATA:", JSON.stringify(item, null, 2));
  } else {
    console.log("Not found");
  }
  
  process.exit(0);
}

run();
