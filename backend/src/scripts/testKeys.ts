import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../../.env') });
import { ContractorAssignment } from '../modules/contractors/contractorAssignment.schema';
import Item from '../modules/items/item.model';

async function test() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/inventory-management');
  
  const items = await Item.find({}).lean();
  const groupMap = new Map();
  const itemIdToKeyMap = new Map();
  const tempCodeToKeyMap = new Map();

  items.forEach(it => {
    const d = it.dynamicData || {};
    const loaSr = String(d.loaSerialNo || d.loaSrNo || d.sku || d.tempCode || it.sku || it.tempCode || '').trim() || it._id.toString();
    const tc = String(d.tempCode || it.tempCode || '').trim();

    if (!groupMap.has(loaSr)) {
      groupMap.set(loaSr, { totalIssuedQty: 0 });
    }
    const grp = groupMap.get(loaSr);
    itemIdToKeyMap.set(it._id.toString(), loaSr);
    if (tc) tempCodeToKeyMap.set(tc, loaSr);
  });

  const getTargetKeys = (lineItemId: any, lineTempCode: any, lineLoaSrNo?: any): string[] => {
    const keys = new Set<string>();
    const idStr = lineItemId ? lineItemId.toString() : '';
    if (idStr && itemIdToKeyMap.has(idStr)) {
      keys.add(itemIdToKeyMap.get(idStr));
    }
    const loaSr = String(lineLoaSrNo || '').trim();
    if (loaSr && groupMap.has(loaSr)) keys.add(loaSr);
    const tc = String(lineTempCode || '').trim();
    if (tc) {
      if (tempCodeToKeyMap.has(tc)) {
        keys.add(tempCodeToKeyMap.get(tc));
      }
      if (groupMap.has(tc)) {
        keys.add(tc);
      }
    }
    return Array.from(keys);
  };

  const assignments = await ContractorAssignment.find({ subcircle: /kumarhatti/i }).limit(10).lean();
  let matched = 0;
  let unmatched = 0;
  
  for (const doc of assignments) {
    for (const line of (doc.lineItems || [])) {
      const keys = getTargetKeys(line.itemId, line.tempCode, line.loaSrNo || line.sku);
      let found = false;
      for (const k of keys) {
        if (groupMap.has(k)) {
          found = true;
          groupMap.get(k).totalIssuedQty += Number(line.quantity || 0);
        }
      }
      if (found) matched++;
      else {
        unmatched++;
        console.log('Unmatched line item:', line);
      }
    }
  }

  console.log(`Matched: ${matched}, Unmatched: ${unmatched}`);
  
  process.exit(0);
}
test();
