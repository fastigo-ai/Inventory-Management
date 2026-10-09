import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const DB_URI = process.env.MONGO_URI || 'mongodb+srv://admin:pass@ac-clx6mva-shard-00-00.lgbl4nv.mongodb.net/fastigo-inventory?retryWrites=true&w=majority';

async function main() {
  await mongoose.connect(DB_URI);
  const { Mhrov } = await import('../src/modules/store/mhrov.schema');
  
  const sample = await Mhrov.findOne({ circle: 'Solan' }).lean();
  console.log("Sample Solan MRHOV:");
  console.log(sample?.mhrovNumber);
  
  const allSolan = await Mhrov.find({ circle: 'Solan' }, { mhrovNumber: 1 }).lean();
  console.log("Some Solan MHROV Numbers:", allSolan.slice(0, 10).map(m => m.mhrovNumber));
  
  process.exit(0);
}

main().catch(console.error);
