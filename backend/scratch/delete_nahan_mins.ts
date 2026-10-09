import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const DB_URI = process.env.MONGO_URI || '';

async function main() {
  await mongoose.connect(DB_URI);
  console.log('Connected to DB');

  const ContractorAssignment = mongoose.connection.collection('contractorassignments');
  const DI = mongoose.connection.collection('dis');

  const targetCircle = 'Nahan';

  // Find the assignments first to see what we are deleting
  const assignments = await ContractorAssignment.find({
    $or: [
      { circle: { $regex: new RegExp(`^${targetCircle}$`, 'i') } },
      { location: { $regex: new RegExp(`^${targetCircle}$`, 'i') } }
    ]
  }).toArray();

  console.log(`Found ${assignments.length} MINs for ${targetCircle}`);

  if (assignments.length === 0) {
    console.log('No MINs found to delete.');
    process.exit(0);
  }

  // Delete them
  const deleteResult = await ContractorAssignment.deleteMany({
    $or: [
      { circle: { $regex: new RegExp(`^${targetCircle}$`, 'i') } },
      { location: { $regex: new RegExp(`^${targetCircle}$`, 'i') } }
    ]
  });

  console.log(`Deleted ${deleteResult.deletedCount} MIN documents for ${targetCircle}`);

  process.exit(0);
}

main().catch(console.error);
