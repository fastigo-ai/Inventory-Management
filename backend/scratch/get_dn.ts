import 'dotenv/config';
import mongoose from 'mongoose';
import DemandNote from '../src/modules/demand-notes/demandNote.schema';

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const dn = await DemandNote.findById('6abe3d9dc16fdb8185b8b62d').lean();
  console.log("DEMAND NOTE DATA:", JSON.stringify(dn, null, 2));
  
  process.exit(0);
}

run();
