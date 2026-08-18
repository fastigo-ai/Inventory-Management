import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || '';

async function fixTransfers() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB.\n');

  const transferCol = mongoose.connection.collection('storetransfers');
  
  // Find all transfers
  const transfers = await transferCol.find({}).toArray();
  console.log(`Found ${transfers.length} transfers in DB.`);

  let updatedCount = 0;

  for (const t of transfers) {
    let newRegisterType = t.registerType;

    // If fromStore is Nahan or Central Store and toStore is another store -> OUTWARD transfer from fromStore
    // If toStore is Nahan/Store -> INWARD transfer
    if (t.fromStore && t.fromStore !== 'Unknown Store') {
      newRegisterType = 'OUTWARD';
    } else if (t.toStore && t.toStore !== 'Unknown Store') {
      newRegisterType = 'INWARD';
    }

    // Update registerType if needed
    if (newRegisterType !== t.registerType || t.registerType === 'INWARD') {
      // If fromStore is Nahan, it's an OUTWARD transfer from Nahan store!
      if (t.fromStore && t.fromStore.toLowerCase().includes('nahan')) {
        newRegisterType = 'OUTWARD';
      }
      await transferCol.updateOne(
        { _id: t._id },
        { $set: { registerType: newRegisterType } }
      );
      updatedCount++;
    }
  }

  console.log(`Updated ${updatedCount} transfers with correct registerType.`);

  // Count by registerType and store
  const outwardNahan = await transferCol.countDocuments({ fromStore: /nahan/i });
  const inwardNahan = await transferCol.countDocuments({ toStore: /nahan/i });

  console.log(`\nTransfers originating from Nahan (Outward): ${outwardNahan}`);
  console.log(`Transfers bound for Nahan (Inward): ${inwardNahan}`);

  await mongoose.disconnect();
}

fixTransfers().catch(err => {
  console.error(err);
  mongoose.disconnect();
});
