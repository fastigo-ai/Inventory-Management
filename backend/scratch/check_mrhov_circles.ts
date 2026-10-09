import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const DB_URI = process.env.MONGO_URI || 'mongodb+srv://admin:pass@ac-clx6mva-shard-00-00.lgbl4nv.mongodb.net/fastigo-inventory?retryWrites=true&w=majority';

async function main() {
  await mongoose.connect(DB_URI);
  const { Mhrov } = await import('../src/modules/store/mhrov.schema');
  
  const allCircles = await Mhrov.aggregate([
    { $group: { _id: "$circle", count: { $sum: 1 } } }
  ]);
  
  console.log("MRHOVs by Circle:");
  console.log(allCircles);
  
  process.exit(0);
}

main().catch(console.error);
