import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });
import { WipRequiredRegister } from './src/modules/wip-required/wipRequired.schema';
import { WipRegister } from './src/modules/wip/wip.schema';

async function run() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/inventory-management');
  
  const w = await WipRegister.find({});
  let wd = 0;
  for(const r of w) {
    if (r.division?.toLowerCase().includes('nahan') || r.circle?.toLowerCase().includes('nahan') || r.remarks?.toLowerCase().includes('nahan')) wd++;
  }
  
  const wr = await WipRequiredRegister.find({});
  let wrd = 0;
  for(const r of wr) {
    if (r.division?.toLowerCase().includes('nahan') || r.circle?.toLowerCase().includes('nahan') || r.remarks?.toLowerCase().includes('nahan')) wrd++;
  }
  
  console.log(`WIP Nahan: ${wd}/${w.length}`);
  console.log(`WIPReq Nahan: ${wrd}/${wr.length}`);
  
  process.exit(0);
}
run();
