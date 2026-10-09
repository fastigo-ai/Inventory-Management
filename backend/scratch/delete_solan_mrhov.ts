import mongoose from 'mongoose';
import { Mhrov } from '../src/modules/store/mhrov.schema';
import { syncMhrovQuantities } from '../src/modules/store/mhrov.controller';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const DB_URI = process.env.MONGO_URI || 'mongodb+srv://admin:pass@ac-clx6mva-shard-00-00.lgbl4nv.mongodb.net/fastigo-inventory?retryWrites=true&w=majority';

async function main() {
  await mongoose.connect(DB_URI);
  console.log('Connected to DB');

  const mrhovs = await Mhrov.find({ circle: { $regex: /solan/i } });
  console.log(`Found ${mrhovs.length} MRHOVs for Solan`);
  
  const inwardEntriesToSync = new Set<string>();
  const diItemsToSync = new Map<string, Set<string>>(); // diId -> Set of itemIds
  
  // 1. Collect all dependent entities
  for (const m of mrhovs) {
    if (m.items && m.items.length > 0) {
      for (const item of m.items) {
        if (item.inwardEntryId) {
          inwardEntriesToSync.add(item.inwardEntryId.toString());
        }
        if (item.diId && item.itemId) {
          const diStr = item.diId.toString();
          if (!diItemsToSync.has(diStr)) {
            diItemsToSync.set(diStr, new Set());
          }
          diItemsToSync.get(diStr)!.add(item.itemId.toString());
        }
      }
    }
  }

  // 2. Delete all Solan MRHOVs
  const mrhovIds = mrhovs.map(m => m._id);
  const deleteResult = await Mhrov.deleteMany({ _id: { $in: mrhovIds } });
  console.log(`Deleted ${deleteResult.deletedCount} MRHOVs`);

  // 3. Trigger syncs which will now recalculate without the deleted MRHOVs
  console.log(`Syncing ${inwardEntriesToSync.size} Inward Entries...`);
  for (const inwardEntryId of inwardEntriesToSync) {
    await syncMhrovQuantities(undefined, undefined, inwardEntryId);
  }
  
  let diSyncCount = 0;
  for (const [diId, itemIds] of diItemsToSync.entries()) {
    for (const itemId of itemIds) {
      await syncMhrovQuantities(diId, itemId);
      diSyncCount++;
    }
  }
  console.log(`Synced ${diSyncCount} DI Line Items...`);
  
  console.log('Successfully completed!');
  process.exit(0);
}

main().catch(console.error);
