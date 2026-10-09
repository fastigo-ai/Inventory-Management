import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const DB_URI = process.env.MONGO_URI || '';

async function main() {
  await mongoose.connect(DB_URI);
  console.log('Connected to DB');

  const DI = mongoose.connection.collection('dis');
  const circles = ['Rohru', 'Rampur'];

  for (const circle of circles) {
    console.log(`\n=== Resetting ${circle} ===`);

    // Find all DIs that have lineItems with this circle
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
  }

  // Verify after reset
  console.log('\n=== Verification ===');
  for (const circle of circles) {
    const dis = await DI.find({
      'lineItems.circle': { $regex: new RegExp(`^${circle}$`, 'i') },
      'lineItems.mhrovDoneQty': { $gt: 0 }
    }).toArray();

    let remaining = 0;
    for (const di of dis) {
      for (const item of (di.lineItems || [])) {
        if (item.circle?.toLowerCase() === circle.toLowerCase() && item.mhrovDoneQty > 0) {
          remaining++;
        }
      }
    }
    console.log(`${circle}: ${remaining} line items still have mhrovDoneQty > 0`);
  }

  process.exit(0);
}

main().catch(console.error);
