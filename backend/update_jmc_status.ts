import 'dotenv/config';
import connectDB from './src/core/database';
import { JmcRegister } from './src/modules/jmc/jmc.schema';
import mongoose from 'mongoose';

async function run() {
  await connectDB();
  const res = await JmcRegister.updateMany(
    { status: 'Draft' },
    { $set: { status: 'Submitted' } }
  );
  console.log(`Updated ${res.modifiedCount} Draft JMCs to Submitted.`);
  mongoose.connection.close();
}
run();
