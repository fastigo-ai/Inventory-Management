import mongoose from 'mongoose';
import path from 'path';
import dotenv from 'dotenv';
import { StoreInwardEntry } from '../modules/store/storeInwardEntry.schema';
import { PurchaseInvoice } from '../modules/purchases/purchaseInvoice.schema';
import { SummaryService } from '../modules/reports/summary/summary.service';
import Item from '../modules/items/item.model';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function syncInwardItemIds() {
  const mongoUri = process.env.MONGO_URI || '';
  await mongoose.connect(mongoUri);

  const masterItems = await Item.find().lean();
  console.log(`Loaded ${masterItems.length} Master Items.`);

  // Build lookup maps
  const keyToItemMap = new Map<string, any>();
  const idToItemMap = new Map<string, any>();

  for (const it of masterItems) {
    const d = it.dynamicData || {};
    const idStr = it._id.toString();
    idToItemMap.set(idStr, it);

    const loa = String(d.sku || d.loaSerialNo || '').trim();
    const pkg = String(d.package || '').trim();
    const circ = String(d.circle || '').trim();
    const tc = String(d.tempCode || '').trim();
    const name = String(d.name || '').trim().toLowerCase();

    if (loa && circ) {
      keyToItemMap.set(`${pkg}___${circ}___${loa}`.toLowerCase(), it);
      keyToItemMap.set(`${circ}___${loa}`.toLowerCase(), it);
    }
    if (tc && circ) {
      keyToItemMap.set(`${pkg}___${circ}___tc_${tc}`.toLowerCase(), it);
      keyToItemMap.set(`${circ}___tc_${tc}`.toLowerCase(), it);
    }
    if (name && circ) {
      keyToItemMap.set(`${pkg}___${circ}___name_${name}`.toLowerCase(), it);
      keyToItemMap.set(`${circ}___name_${name}`.toLowerCase(), it);
    }
  }

  const allInwards = await StoreInwardEntry.find().lean();
  console.log(`Auditing and fixing ${allInwards.length} StoreInwardEntry records...`);

  // Cache PIs to avoid redundant DB queries
  const piCache = new Map<string, any>();
  const allPis = await PurchaseInvoice.find().lean();
  for (const pi of allPis) {
    piCache.set(pi._id.toString(), pi);
  }

  let updatedCount = 0;
  const affectedItemIds = new Set<string>();

  for (const inv of allInwards) {
    let matchedItem: any = null;
    const invCircle = String(inv.circle || '').trim();
    const invPkg = String(inv.package || '').trim();
    const invName = String(inv.itemName || '').trim().toLowerCase();
    const invTempCode = String(inv.tempCode || '').trim();

    // 1. Try to get exact item info from linked PurchaseInvoice
    if (inv.purchaseInvoiceId && piCache.has(inv.purchaseInvoiceId.toString())) {
      const pi = piCache.get(inv.purchaseInvoiceId.toString());
      const piLines = pi.lineItems || [];

      // Find matching line in PI
      let matchingPiLine = piLines.find((li: any) => {
        const liName = String(li.itemName || '').trim().toLowerCase();
        const liTc = String(li.tempCode || '').trim();
        const liCirc = String(li.circle || '').trim().toLowerCase();
        return (liName === invName || (liTc && liTc === invTempCode)) && (!invCircle || liCirc === invCircle.toLowerCase());
      });

      if (!matchingPiLine && piLines.length === 1) {
        matchingPiLine = piLines[0];
      }

      if (!matchingPiLine) {
        matchingPiLine = piLines.find((li: any) => {
          const liName = String(li.itemName || '').trim().toLowerCase();
          return liName === invName;
        });
      }

      if (matchingPiLine) {
        const piItemId = matchingPiLine.itemId?.toString();
        const piLoa = String(matchingPiLine.loaSerialNo || '').trim();
        const piCircle = String(matchingPiLine.circle || invCircle || '').trim();
        const piPkg = String(matchingPiLine.package || invPkg || '').trim();

        if (piItemId && idToItemMap.has(piItemId)) {
          matchedItem = idToItemMap.get(piItemId);
        } else if (piLoa && piCircle) {
          matchedItem = keyToItemMap.get(`${piPkg}___${piCircle}___${piLoa}`.toLowerCase())
            || keyToItemMap.get(`${piCircle}___${piLoa}`.toLowerCase());
        }
      }
    }

    // 2. Fallback: match by serialNumber / loaSerialNo + circle + package
    if (!matchedItem && (inv.serialNumber || (inv as any).loaSerialNo)) {
      const loa = String(inv.serialNumber || (inv as any).loaSerialNo).trim();
      matchedItem = keyToItemMap.get(`${invPkg}___${invCircle}___${loa}`.toLowerCase())
        || keyToItemMap.get(`${invCircle}___${loa}`.toLowerCase());
    }

    // 3. Fallback: match by name + circle + package
    if (!matchedItem && invName && invCircle) {
      matchedItem = keyToItemMap.get(`${invPkg}___${invCircle}___name_${invName}`.toLowerCase())
        || keyToItemMap.get(`${invCircle}___name_${invName}`.toLowerCase());
    }

    if (matchedItem) {
      const correctItemId = matchedItem._id;
      const correctLoa = matchedItem.dynamicData?.sku || matchedItem.dynamicData?.loaSerialNo || '';
      const correctTc = matchedItem.dynamicData?.tempCode || invTempCode;
      const correctCircle = matchedItem.dynamicData?.circle || invCircle;
      const correctPkg = matchedItem.dynamicData?.package || invPkg;

      await StoreInwardEntry.updateOne(
        { _id: inv._id },
        {
          $set: {
            itemId: correctItemId,
            serialNumber: correctLoa,
            tempCode: correctTc,
            circle: correctCircle,
            package: correctPkg
          }
        }
      );

      affectedItemIds.add(correctItemId.toString());
      if (inv.itemId) affectedItemIds.add(inv.itemId.toString());
      updatedCount++;
    }
  }

  console.log(`Updated ${updatedCount} StoreInwardEntry documents with exact Master Item IDs.`);
  console.log(`Rebuilding summary for ${affectedItemIds.size} affected items...`);

  let rebuildCount = 0;
  for (const id of affectedItemIds) {
    await SummaryService.rebuildForItem(id);
    rebuildCount++;
    if (rebuildCount % 200 === 0) {
      console.log(`Rebuilt ${rebuildCount} / ${affectedItemIds.size} items...`);
    }
  }

  console.log('Inward / MRHOV Rebuild complete!');
  await mongoose.disconnect();
}

syncInwardItemIds().catch(console.error);
