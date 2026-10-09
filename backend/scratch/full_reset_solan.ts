import mongoose from 'mongoose';
import { DI } from '../src/modules/di/di.schema';
import { StoreInwardEntry } from '../src/modules/store/storeInwardEntry.schema';
import { syncMhrovQuantities } from '../src/modules/store/mhrov.controller';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const DB_URI = process.env.MONGO_URI || 'mongodb+srv://admin:pass@ac-clx6mva-shard-00-00.lgbl4nv.mongodb.net/fastigo-inventory?retryWrites=true&w=majority';

async function main() {
  await mongoose.connect(DB_URI);
  console.log('Connected to DB');

  const solanDIs = await DI.find({ circle: { $regex: /solan/i } });
  console.log(`Found ${solanDIs.length} DIs for Solan`);
  
  let diSyncCount = 0;
  for (const di of solanDIs) {
    // Collect all unique itemIds in this DI
    const itemIds = new Set<string>();
    di.lineItems.forEach((li: any) => {
      if (li.itemId) {
        itemIds.add(li.itemId.toString());
      }
    });
    
    for (const itemId of itemIds) {
      await syncMhrovQuantities(di._id.toString(), itemId);
      diSyncCount++;
    }
  }
  console.log(`Synced ${diSyncCount} DI Line Items!`);

  const solanInwards = await StoreInwardEntry.find({ circle: { $regex: /solan/i } });
  console.log(`Found ${solanInwards.length} Inward Entries for Solan`);
  
  let inwardSyncCount = 0;
  for (const entry of solanInwards) {
    await syncMhrovQuantities(undefined, undefined, entry._id.toString());
    inwardSyncCount++;
  }
  console.log(`Synced ${inwardSyncCount} Inward Entries!`);

  console.log('Done fully resetting Solan DIs and Inwards!');
  process.exit(0);
}

main().catch(console.error);
