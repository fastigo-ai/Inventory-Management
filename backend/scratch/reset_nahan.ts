import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const DB_URI = process.env.MONGO_URI || '';

async function main() {
  await mongoose.connect(DB_URI);
  console.log('Connected to DB');

  const DI = mongoose.connection.collection('dis');
  const Mhrov = mongoose.connection.collection('mhrovs');
  
  const circle = 'Nahan';

  // 1. Delete MHROVs for Nahan
  console.log(`\n=== Deleting ${circle} MHROVs ===`);
  const deleteResult = await Mhrov.deleteMany({
    circle: { $regex: new RegExp(`^${circle}$`, 'i') }
  });
  console.log(`Deleted ${deleteResult.deletedCount} MHROV documents for ${circle}`);

  // 2. Reset DI Consumption for Nahan
  console.log(`\n=== Resetting ${circle} DI Consumption ===`);
  const dis = await DI.find({
    'lineItems.circle': { $regex: new RegExp(`^${circle}$`, 'i') }
  }).toArray();

  console.log(`Found ${dis.length} DIs with ${circle} line items`);

  let resetCount = 0;

  for (const di of dis) {
    if (!di.lineItems) continue;

    let modified = false;
    const updatedLineItems = di.lineItems.map((item: any) => {
      const circleMatch = item.circle && item.circle.toLowerCase() === circle.toLowerCase();
      if (circleMatch && (item.mhrovDoneQty > 0 || item.mhrovStatus !== 'PENDING')) {
        modified = true;
        resetCount++;
        return {
          ...item,
          mhrovDoneQty: 0,
          mhrovStatus: 'PENDING'
        };
      }
      return item;
    });

    if (modified) {
      await DI.updateOne(
        { _id: di._id },
        { $set: { lineItems: updatedLineItems } }
      );
    }
  }

  console.log(`Reset ${resetCount} line items for ${circle}`);

  // Verify
  const remainingMhrovs = await Mhrov.countDocuments({ circle: { $regex: new RegExp(`^${circle}$`, 'i') } });
  console.log(`Remaining Nahan MHROVs: ${remainingMhrovs}`);

  const remainingDis = await DI.find({
    'lineItems.circle': { $regex: new RegExp(`^${circle}$`, 'i') },
    'lineItems.mhrovDoneQty': { $gt: 0 }
  }).toArray();
  
  let remainingDiCount = 0;
  for (const di of remainingDis) {
    for (const item of (di.lineItems || [])) {
      if (item.circle?.toLowerCase() === circle.toLowerCase() && item.mhrovDoneQty > 0) {
        remainingDiCount++;
      }
    }
  }
  console.log(`Remaining Nahan DI line items with consumption > 0: ${remainingDiCount}`);

  process.exit(0);
}

main().catch(console.error);
