import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load env from backend root
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { StoreInwardEntry } from '../modules/store/storeInwardEntry.schema';
import { DI } from '../modules/di/di.schema';
import { Mhrov } from '../modules/store/mhrov.schema';

const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/erp-system';

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to DB');

  const mhrovs = await Mhrov.find({});
  console.log(`Found ${mhrovs.length} MHROVs`);

  const inwardDoneMap = new Map<string, number>();
  const diDoneMap = new Map<string, number>();

  for (const m of mhrovs) {
    if (m.items) {
      for (const it of m.items) {
        if (it.inwardEntryId) {
          const key = it.inwardEntryId.toString();
          inwardDoneMap.set(key, (inwardDoneMap.get(key) || 0) + (it.mhrovDoneQty || 0));
        }
        if (it.diId && it.itemId) {
          const key = `${it.diId.toString()}_${it.itemId.toString()}`;
          diDoneMap.set(key, (diDoneMap.get(key) || 0) + (it.mhrovDoneQty || 0));
        }
      }
    }
  }

  // Update Inward Entries
  const inwards = await StoreInwardEntry.find({});
  let inwardUpdates = 0;
  for (const entry of inwards) {
    const doneQty = inwardDoneMap.get(entry._id.toString()) || 0;
    const totalQty = Number(entry.totalQty || entry.invoiceQty || entry.challanQty || 0);
    const pendingQty = Math.max(0, totalQty - doneQty);
    let status = 'PENDING';
    if (doneQty > 0) {
      status = pendingQty <= 0 ? 'COMPLETED' : 'PARTIAL';
    }

    entry.mhrovDoneQty = doneQty;
    entry.pendingMhrovQty = pendingQty;
    entry.mhrovStatus = status as any;
    await entry.save();
    inwardUpdates++;
  }
  console.log(`Updated ${inwardUpdates} StoreInwardEntries`);

  // Update DIs
  const dis = await DI.find({});
  let diUpdates = 0;
  for (const di of dis) {
    let updated = false;
    
    // Group line items by itemId so we can distribute doneQty correctly
    const lineItemsByItemId = new Map<string, any[]>();
    for (const li of di.lineItems) {
      if (li.itemId) {
        const id = li.itemId.toString();
        if (!lineItemsByItemId.has(id)) lineItemsByItemId.set(id, []);
        lineItemsByItemId.get(id)!.push(li);
      }
    }
    
    for (const [itemId, items] of lineItemsByItemId.entries()) {
        const key = `${di._id.toString()}_${itemId}`;
        let remainingToApply = diDoneMap.get(key) || 0;
        
        items.forEach((li: any, index: number) => {
            const isLast = index === items.length - 1;
            const applied = isLast ? remainingToApply : Math.min(Number(li.quantity || 0), remainingToApply);
            
            li.mhrovDoneQty = applied;
            li.pendingMhrovQty = Math.max(0, Number(li.quantity || 0) - applied);
            remainingToApply = Math.max(0, remainingToApply - applied);
            
            if (applied === 0) li.mhrovStatus = 'PENDING';
            else if (li.pendingMhrovQty <= 0) li.mhrovStatus = 'COMPLETED';
            else li.mhrovStatus = 'PARTIAL';
            
            updated = true;
        });
    }

    if (updated) {
      di.markModified('lineItems');
      await di.save();
      diUpdates++;
    }
  }
  console.log(`Updated ${diUpdates} DIs`);

  await mongoose.disconnect();
  console.log('Done');
}

run().catch(console.error);
