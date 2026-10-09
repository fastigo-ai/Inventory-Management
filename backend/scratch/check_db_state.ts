import mongoose from 'mongoose';
import { Mhrov } from '../src/modules/store/mhrov.schema';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const DB_URI = process.env.MONGO_URI || 'mongodb+srv://admin:pass@ac-clx6mva-shard-00-00.lgbl4nv.mongodb.net/fastigo-inventory?retryWrites=true&w=majority';

async function main() {
  await mongoose.connect(DB_URI);
  
  // Find any MRHOV that has an item with circle 'Solan'
  const allMhrovs = await Mhrov.find({});
  let solanCount = 0;
  for (const m of allMhrovs) {
    if (m.circle?.toLowerCase().includes('solan')) {
      solanCount++;
    } else if (m.items && m.items.some((i: any) => i.circle?.toLowerCase().includes('solan'))) {
      solanCount++;
    }
  }
  
  console.log(`Total MRHOVs with Solan references left in DB: ${solanCount}`);
  
  // Look at one specific DI that was reported in the errors
  const diId = '6ac3958a4db51ea1259c40ed'; // Wait, let's just use diId from before, or search by itemId
  // Search for the specific item: GI STAY WIRE, LOA 2051, DI 21058-86
  // We'll just check what the database actually has right now.
  const { DI } = await import('../src/modules/di/di.schema');
  const di = await DI.findOne({ diNumber: '21058-86' });
  if (di) {
    const item = di.lineItems.find((li: any) => li.loaSerialNo === '2051' && li.itemName.includes('GI STAY WIRE'));
    console.log(`\nDI 21058-86, LOA 2051:`);
    console.log(`Quantity: ${item?.quantity}, mhrovDoneQty: ${item?.mhrovDoneQty}`);
  }
  
  process.exit(0);
}

main().catch(console.error);
