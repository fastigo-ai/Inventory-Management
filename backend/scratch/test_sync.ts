import mongoose from 'mongoose';
import { DI } from '../src/modules/di/di.schema';
import { Mhrov } from '../src/modules/store/mhrov.schema';
import { syncMhrovQuantities } from '../src/modules/store/mhrov.controller';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const DB_URI = process.env.MONGO_URI || 'mongodb+srv://admin:pass@ac-clx6mva-shard-00-00.lgbl4nv.mongodb.net/fastigo-inventory?retryWrites=true&w=majority';

async function main() {
  await mongoose.connect(DB_URI);
  
  const diId = '6a6396e3c0f20cd5693457cd'; // Wait, I need the actual diId.
  const di = await DI.findOne({ diNumber: '21058-86' });
  if (!di) {
    console.log('DI not found');
    process.exit(0);
  }
  
  const itemId = '6a8990c3a215f565017f1c76';
  
  console.log(`Before sync, mhrovDoneQty:`);
  const item = di.lineItems.find(li => li.itemId?.toString() === itemId);
  console.log(item?.mhrovDoneQty);
  
  console.log('Running syncMhrovQuantities...');
  await syncMhrovQuantities(di._id.toString(), itemId);
  
  console.log(`After sync, mhrovDoneQty:`);
  const diAfter = await DI.findOne({ diNumber: '21058-86' });
  const itemAfter = diAfter?.lineItems.find(li => li.itemId?.toString() === itemId);
  console.log(itemAfter?.mhrovDoneQty);
  
  process.exit(0);
}

main().catch(console.error);
