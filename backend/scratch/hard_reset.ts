import mongoose from 'mongoose';
import { DI } from '../src/modules/di/di.schema';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const DB_URI = process.env.MONGO_URI || 'mongodb+srv://admin:pass@ac-clx6mva-shard-00-00.lgbl4nv.mongodb.net/fastigo-inventory?retryWrites=true&w=majority';

async function main() {
  await mongoose.connect(DB_URI);
  console.log('Connected to DB');

  const solanDIs = await DI.find({ circle: { $regex: /solan/i } });
  console.log(`Found ${solanDIs.length} DIs for Solan`);
  
  let totalLineItemsUpdated = 0;
  for (const di of solanDIs) {
    let updated = false;
    
    if (di.lineItems && di.lineItems.length > 0) {
      for (const li of di.lineItems) {
        if (li.mhrovDoneQty !== 0 || li.pendingMhrovQty !== li.quantity || li.mhrovStatus !== 'PENDING') {
          li.mhrovDoneQty = 0;
          li.pendingMhrovQty = li.quantity || 0;
          li.mhrovStatus = 'PENDING';
          updated = true;
          totalLineItemsUpdated++;
        }
      }
    }
    
    if (updated) {
      di.markModified('lineItems');
      await di.save();
    }
  }
  
  console.log(`Successfully hard-reset ${totalLineItemsUpdated} DI Line Items for Solan to 0!`);
  
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
