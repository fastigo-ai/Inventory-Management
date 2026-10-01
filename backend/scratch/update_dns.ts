import 'dotenv/config';
import mongoose from 'mongoose';
import DemandNote from '../src/modules/demand-notes/demandNote.schema';

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const ids = [
    '6abe3d9dc16fdb8185b8b62d',
    '6abe3d3ec16fdb8185b8b2d8',
    '6abe3cc4c16fdb8185b8b176'
  ];

  const result = await DemandNote.updateMany(
    { _id: { $in: ids } },
    { $set: { subcircle: 'Nalagarh' } }
  );

  console.log(`Updated ${result.modifiedCount} documents.`);
  
  process.exit(0);
}

run().catch(err => {
  console.error("Error updating demand notes:", err);
  process.exit(1);
});
