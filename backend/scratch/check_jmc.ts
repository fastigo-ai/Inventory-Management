import mongoose from 'mongoose';
import { JmcRegister } from '../src/modules/jmc/jmc.schema';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/inventory_db');
  const jmcs = await JmcRegister.find({ status: 'Approved' }).limit(3);
  console.log(JSON.stringify(jmcs.map(j => j.items), null, 2));
  process.exit(0);
}
run();
