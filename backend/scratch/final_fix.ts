import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const DB_URI = process.env.MONGO_URI || 'mongodb+srv://admin:pass@ac-clx6mva-shard-00-00.lgbl4nv.mongodb.net/fastigo-inventory?retryWrites=true&w=majority';

async function main() {
  await mongoose.connect(DB_URI);
  console.log('Connected to DB');
  
  const { DI } = await import('../src/modules/di/di.schema');

  // Find all DIs that have ANY line item belonging to Solan
  const dis = await DI.find({ 
    $or: [
      { circle: { $regex: /solan/i } },
      { 'lineItems.circle': { $regex: /solan/i } }
    ]
  });
  
  console.log(`Found ${dis.length} DIs containing Solan line items.`);
  
  let changedDiCount = 0;
  let changedItemCount = 0;
  
  for (const di of dis) {
    let changed = false;
    const newItems = di.lineItems.map((li: any) => {
      // Check if THIS specific line item is Solan OR if the parent DI is Solan
      const isSolan = (li.circle && li.circle.toLowerCase().includes('solan')) || 
                      (!li.circle && di.circle && di.circle.toLowerCase().includes('solan'));
                      
      if (isSolan) {
        const pending = li.quantity || 0;
        if (li.mhrovDoneQty !== 0 || li.pendingMhrovQty !== pending || li.mhrovStatus !== 'PENDING') {
          changed = true;
          changedItemCount++;
          return {
            ...li.toObject(),
            mhrovDoneQty: 0,
            pendingMhrovQty: pending,
            mhrovStatus: 'PENDING'
          };
        }
      }
      return li;
    });

    if (changed) {
      await DI.collection.updateOne(
        { _id: di._id },
        { $set: { lineItems: newItems } }
      );
      changedDiCount++;
    }
  }

  console.log(`Successfully hard-reset ${changedItemCount} Line Items across ${changedDiCount} DIs!`);
  
  // Verify one of the problem ones
  const diAfter = await DI.findOne({ diNumber: '21058-86' });
  if (diAfter) {
    const item = diAfter.lineItems.find((li: any) => li.loaSerialNo === '2051' && li.itemName.includes('GI STAY WIRE'));
    console.log(`\nDI 21058-86, LOA 2051:`);
    console.log(`Quantity: ${item?.quantity}, mhrovDoneQty: ${item?.mhrovDoneQty}`);
  }
  
  process.exit(0);
}

main().catch(console.error);
