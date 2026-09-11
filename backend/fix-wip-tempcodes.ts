import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

import { WipRequiredRegister } from './src/modules/wip-required/wipRequired.schema';
import { WipRegister } from './src/modules/wip/wip.schema';
import Item from './src/modules/items/item.model';

async function run() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/inventory-management');
  console.log('Connected to DB');

  const items = await Item.find({}).lean();
  const itemMap = new Map();
  for (const item of items) {
    itemMap.set(item._id.toString(), {
      tempCode: item.dynamicData?.tempCode || '',
      loaSerialNo: item.dynamicData?.sku || item.dynamicData?.loaSerialNo || ''
    });
  }

  console.log(`Loaded ${items.length} items from master list.`);

  // Fix WipRequiredRegister
  const wipReqs = await WipRequiredRegister.find({});
  let reqUpdated = 0;
  for (const doc of wipReqs) {
    let changed = false;
    if (doc.items && Array.isArray(doc.items)) {
      for (const it of doc.items as any) {
        if (it.itemId) {
          const master = itemMap.get(it.itemId.toString());
          if (master) {
            if (!it.tempCode || it.tempCode !== master.tempCode) {
              it.tempCode = master.tempCode;
              changed = true;
            }
            if (!it.loaSerialNo || it.loaSerialNo !== master.loaSerialNo) {
              it.loaSerialNo = master.loaSerialNo;
              changed = true;
            }
          }
        }
      }
    }
    if (changed) {
      doc.markModified('items');
      await doc.save();
      reqUpdated++;
    }
  }
  console.log(`Updated ${reqUpdated} WipRequiredRegister documents.`);

  // Fix WipRegister
  const wips = await WipRegister.find({});
  let wipUpdated = 0;
  for (const doc of wips) {
    let changed = false;
    if (doc.items && Array.isArray(doc.items)) {
      for (const it of doc.items as any) {
        if (it.itemId) {
          const master = itemMap.get(it.itemId.toString());
          if (master) {
            if (!it.tempCode || it.tempCode !== master.tempCode) {
              it.tempCode = master.tempCode;
              changed = true;
            }
            if (!it.loaSerialNo || it.loaSerialNo !== master.loaSerialNo) {
              it.loaSerialNo = master.loaSerialNo;
              changed = true;
            }
          }
        }
      }
    }
    if (changed) {
      doc.markModified('items');
      await doc.save();
      wipUpdated++;
    }
  }
  console.log(`Updated ${wipUpdated} WipRegister documents.`);

  await mongoose.disconnect();
  console.log('Done');
}

run().catch(console.error);
