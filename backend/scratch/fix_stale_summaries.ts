import mongoose from 'mongoose';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/test';

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;

    // The real root fix: for every itemId+circle combo, 
    // delete all summary rows and then do a targeted rebuild from scratch
    // But first, let's just fix the known bad rows by direct deletion of stale data
    
    // Delete rows where package = "Package 1 (S/N)" (with space) in Nahan/Solan - these are duplicates
    // We keep "Package 1(S/N)" (without space) which is the canonical form
    
    const result = await db.collection('itemsummaries').deleteMany({
      package: { $in: ['Package 1 (S/N)', 'Package 2 (R/R)', 'Package 1 (R/R)', 'Package 2 (S/N)'] }
    });
    console.log(`Deleted ${result.deletedCount} stale duplicate summary rows with spaced package names.`);

    // Also fix NAHAN -> Nahan case
    const caseResult = await db.collection('itemsummaries').updateMany(
      { circle: 'NAHAN' },
      { $set: { circle: 'Nahan' } }
    );
    console.log(`Fixed ${caseResult.modifiedCount} rows with NAHAN -> Nahan.`);

    const rohruResult = await db.collection('itemsummaries').updateMany(
      { circle: 'ROHRU' },
      { $set: { circle: 'Rohru' } }
    );
    console.log(`Fixed ${rohruResult.modifiedCount} rows with ROHRU -> Rohru.`);

    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
run();
