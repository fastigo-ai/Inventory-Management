import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });
import { WipRegister } from './src/modules/wip/wip.schema';

async function run() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/inventory-management');
  
  const wips = await WipRegister.find({ location: { $exists: false } }).lean();
  let count = 0;
  for (const wip of wips) {
    await WipRegister.updateOne(
      { _id: wip._id },
      { $set: { location: wip.package, package: '' } }
    );
    count++;
  }
  
  const wipsEmptyLoc = await WipRegister.find({ location: '', package: { $ne: '' } }).lean();
  for (const wip of wipsEmptyLoc) {
    await WipRegister.updateOne(
      { _id: wip._id },
      { $set: { location: wip.package, package: '' } }
    );
    count++;
  }

  console.log(`Migrated ${count} WIP documents by moving package to location.`);
  process.exit(0);
}
run();
