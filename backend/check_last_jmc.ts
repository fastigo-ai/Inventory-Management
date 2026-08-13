import 'dotenv/config';
import connectDB from './src/core/database';
import { JmcRegister } from './src/modules/jmc/jmc.schema';
import mongoose from 'mongoose';

async function run() {
  await connectDB();
  const doc = await JmcRegister.findOne().sort({createdAt:-1}).lean();
  console.log(JSON.stringify(doc, null, 2));
  mongoose.connection.close();
}
run();
