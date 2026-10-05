const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const MONGO_URI = process.env.MONGO_URI;

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;

    const rohruRegex = /rohru/i;

    // 1. Check for missing DI links in ROHRU
    const allPis = await db.collection('purchaseinvoices').find({ "lineItems.circle": { $regex: rohruRegex } }).toArray();
    let pisToDelete = 0;
    let itemsRemovedCount = 0;
    let storeInwardDeletedCount = 0;

    for (const pi of allPis) {
      const originalLen = pi.lineItems.length;
      
      const goodItems = [];
      const badRohruItems = [];

      for (const item of pi.lineItems) {
        const isRohru = item.circle && item.circle.match(rohruRegex);
        // Is DI linked?
        const hasDi = item.diId || item.diNumber || pi.diNumber;
        
        if (isRohru && !hasDi) {
          badRohruItems.push(item);
        } else {
          goodItems.push(item);
        }
      }

      if (badRohruItems.length > 0) {
        itemsRemovedCount += badRohruItems.length;
        if (goodItems.length === 0) {
          await db.collection('purchaseinvoices').deleteOne({ _id: pi._id });
          const res = await db.collection('storeinwardentries').deleteMany({ purchaseInvoiceId: pi._id });
          storeInwardDeletedCount += res.deletedCount;
          pisToDelete++;
        } else {
          let subTotal = 0;
          let total = 0;
          let taxAmount = 0;

          goodItems.forEach(item => {
            subTotal += (item.amount || 0);
            total += (item.totalAmount || item.amount || 0);
            taxAmount += ((item.totalAmount || item.amount || 0) - (item.amount || 0));
          });

          await db.collection('purchaseinvoices').updateOne(
            { _id: pi._id },
            { $set: { lineItems: goodItems, subTotal, total, taxAmount } }
          );

          // Delete corresponding store inward entries for the removed items
          for (const bad of badRohruItems) {
            const res = await db.collection('storeinwardentries').deleteMany({ 
              purchaseInvoiceId: pi._id,
              itemId: bad.itemId
            });
            storeInwardDeletedCount += res.deletedCount;
          }
        }
      }
    }

    console.log(`\n=== ROHRU Missing DI Link Cleanup ===`);
    console.log(`Removed ${itemsRemovedCount} ROHRU line items with NO DI linked.`);
    console.log(`Entire PIs deleted: ${pisToDelete}`);
    console.log(`Store inward entries deleted: ${storeInwardDeletedCount}`);


    // 2. Compare DI vs PI qty for ROHRU items
    // First, calculate total DI qty for each item in ROHRU
    const dis = await db.collection('dis').find({ "lineItems.circle": { $regex: rohruRegex } }).toArray();
    const diQtyMap = new Map(); // itemId -> qty

    for (const di of dis) {
      for (const item of di.lineItems) {
        if (item.circle && item.circle.match(rohruRegex)) {
          const key = item.itemId ? item.itemId.toString() : item.itemName;
          const current = diQtyMap.get(key) || 0;
          diQtyMap.set(key, current + (Number(item.quantity) || 0));
        }
      }
    }

    // Now calculate total PI qty for each item in ROHRU
    const pis = await db.collection('purchaseinvoices').find({ "lineItems.circle": { $regex: rohruRegex } }).toArray();
    const piQtyMap = new Map();

    for (const pi of pis) {
      for (const item of pi.lineItems) {
        if (item.circle && item.circle.match(rohruRegex)) {
          const key = item.itemId ? item.itemId.toString() : item.itemName;
          const current = piQtyMap.get(key) || 0;
          piQtyMap.set(key, current + (Number(item.quantity) || 0));
        }
      }
    }

    // Compare and list items where PI > DI
    console.log(`\n=== ROHRU PI > DI Quantity Check ===`);
    const exceededItems = [];
    
    // We also need item names for readable output
    for (const [key, piQty] of piQtyMap.entries()) {
      const diQty = diQtyMap.get(key) || 0;
      if (piQty > diQty) {
        // Try to find the item name
        let itemName = "Unknown";
        if (mongoose.Types.ObjectId.isValid(key)) {
           const itemDoc = await db.collection('items').findOne({ _id: new mongoose.Types.ObjectId(key) });
           if (itemDoc && itemDoc.dynamicData) itemName = itemDoc.dynamicData.name;
        } else {
           itemName = key; // If key was itemName fallback
        }

        exceededItems.push({
          id: key,
          name: itemName,
          piQty: piQty,
          diQty: diQty,
          diff: piQty - diQty
        });
      }
    }

    if (exceededItems.length > 0) {
      exceededItems.sort((a, b) => b.diff - a.diff);
      console.log(`Found ${exceededItems.length} items where PI Qty exceeds DI Qty in ROHRU:\n`);
      for (const ex of exceededItems) {
        console.log(`- ${ex.name} | DI Qty: ${ex.diQty} | PI Qty: ${ex.piQty} | Exceeded by: ${ex.diff}`);
      }
    } else {
      console.log(`All good! No items in ROHRU have a PI quantity greater than their DI quantity.`);
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
