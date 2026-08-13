import 'dotenv/config';
import connectDB from './src/core/database';
import { JmcRegister } from './src/modules/jmc/jmc.schema';
import mongoose from 'mongoose';

async function run() {
  await connectDB();
  const docs = await JmcRegister.find().sort({ createdAt: 1 }).lean();
  console.log(`Total JMCs in DB: ${docs.length}`);
  
  if (docs.length > 66) {
    const toDelete = docs.slice(66);
    console.log(`Need to delete ${toDelete.length} JMCs.`);
    const deleteIds = toDelete.map(d => d._id);
    const res = await JmcRegister.deleteMany({ _id: { $in: deleteIds } });
    console.log(`Deleted ${res.deletedCount} JMCs.`);
  } else {
    console.log('No extra JMCs to delete.');
  }

  mongoose.connection.close();
}
run();
