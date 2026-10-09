import mongoose from 'mongoose';
import { Mhrov } from '../src/modules/store/mhrov.schema';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const DB_URI = process.env.MONGO_URI || 'mongodb+srv://admin:pass@ac-clx6mva-shard-00-00.lgbl4nv.mongodb.net/fastigo-inventory?retryWrites=true&w=majority';

async function main() {
  await mongoose.connect(DB_URI);
  console.log('Connected to DB');

  const result = await Mhrov.updateMany(
    { circle: { $regex: /solan/i } },
    { $set: { status: 'DONE' } }
  );
  
  console.log(`Updated ${result.modifiedCount} MRHOV statuses to 'DONE' for Solan circle.`);
  
  process.exit(0);
}

main().catch(console.error);
