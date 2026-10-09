import mongoose from 'mongoose';
import { DI } from '../src/modules/di/di.schema';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const DB_URI = process.env.MONGO_URI || 'mongodb+srv://admin:pass@ac-clx6mva-shard-00-00.lgbl4nv.mongodb.net/fastigo-inventory?retryWrites=true&w=majority';

async function main() {
  await mongoose.connect(DB_URI);
  console.log('Connected to DB');

  const result = await DI.collection.updateMany(
    { circle: { $regex: /solan/i } },
    { 
      $set: { 
        "lineItems.$[elem].mhrovDoneQty": 0,
        "lineItems.$[elem].mhrovStatus": "PENDING"
      } 
    },
    { 
      arrayFilters: [{ "elem.mhrovDoneQty": { $gt: 0 } }],
      multi: true
    }
  );
  
  console.log(`Modified ${result.modifiedCount} DIs directly in MongoDB`);

  // We also need to fix pendingMhrovQty which should be equal to quantity
  // but MongoDB updateMany with arithmetic is tricky in older versions, 
  // so let's just do a bulkWrite or iterate and use document updates cleanly.

  const solanDIs = await DI.find({ circle: { $regex: /solan/i } });
  for (const di of solanDIs) {
    let changed = false;
    const newItems = di.lineItems.map((li: any) => {
      const pending = li.quantity || 0;
      if (li.mhrovDoneQty !== 0 || li.pendingMhrovQty !== pending || li.mhrovStatus !== 'PENDING') {
        changed = true;
        return {
          ...li.toObject(),
          mhrovDoneQty: 0,
          pendingMhrovQty: pending,
          mhrovStatus: 'PENDING'
        };
      }
      return li;
    });

    if (changed) {
      await DI.collection.updateOne(
        { _id: di._id },
        { $set: { lineItems: newItems } }
      );
    }
  }

  console.log(`Successfully hard-reset via DB driver!`);
  
  // Verify one of the problem ones
  const di = await DI.findOne({ diNumber: '21058-86' });
  if (di) {
    const item = di.lineItems.find((li: any) => li.loaSerialNo === '2051' && li.itemName.includes('GI STAY WIRE'));
    console.log(`\nDI 21058-86, LOA 2051:`);
    console.log(`Quantity: ${item?.quantity}, mhrovDoneQty: ${item?.mhrovDoneQty}`);
  }
  
  process.exit(0);
}

main().catch(console.error);
