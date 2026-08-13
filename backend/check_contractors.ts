import 'dotenv/config';
import connectDB from './src/core/database';
import { Contractor } from './src/modules/contractors/contractor.schema';
import mongoose from 'mongoose';

async function run() {
  await connectDB();
  const count = await Contractor.countDocuments({isActive: true});
  console.log('Active contractors:', count);
  const all = await Contractor.find({}).limit(5).lean();
  console.log('Sample contractors:', JSON.stringify(all, null, 2));
  mongoose.connection.close();
}
run();
