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
    // Find all DIs that have lineItems with this circle
    const dis = await DI.find({
      'lineItems.circle': { $regex: new RegExp(`^${circle}$`, 'i') }
    }).toArray();

    console.log(`\n=== ${circle} ===`);
    console.log(`Found ${dis.length} DIs with ${circle} line items`);

    let totalLineItems = 0;
    let lineItemsWithMhrovDone = 0;

    for (const di of dis) {
      if (di.lineItems) {
        for (const item of di.lineItems) {
          const circleMatch = item.circle && item.circle.toLowerCase() === circle.toLowerCase();
          if (circleMatch) {
            totalLineItems++;
            if (item.mhrovDoneQty && item.mhrovDoneQty > 0) {
              lineItemsWithMhrovDone++;
              console.log(`  DI ${di.diNumber} | LOA ${item.loaNumber} | Item: ${item.itemName?.substring(0, 40)} | mhrovDoneQty: ${item.mhrovDoneQty} | mhrovStatus: ${item.mhrovStatus}`);
            }
          }
        }
      }
    }

    console.log(`Total ${circle} line items: ${totalLineItems}`);
    console.log(`Line items with mhrovDoneQty > 0: ${lineItemsWithMhrovDone}`);
  }

  process.exit(0);
}

main().catch(console.error);
