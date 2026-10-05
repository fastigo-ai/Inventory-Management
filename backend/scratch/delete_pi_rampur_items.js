const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const MONGO_URI = process.env.MONGO_URI;

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;

    const targetRegex = /^rampur$/i;
    
    // Find all PIs that have at least one line item in Rampur
    const pis = await db.collection('purchaseinvoices').find({
      "lineItems.circle": { $regex: targetRegex }
    }).toArray();

    console.log(`Found ${pis.length} Purchase Invoices containing Rampur line items.`);

    let piDeletedCount = 0;
    let piUpdatedCount = 0;
    let storeInwardDeletedCount = 0;
    const affectedItemIds = new Set();

    for (const pi of pis) {
      const nahanItems = pi.lineItems.filter(item => item.circle && item.circle.match(targetRegex));
      const nonNahanItems = pi.lineItems.filter(item => !(item.circle && item.circle.match(targetRegex)));

      nahanItems.forEach(item => {
        if (item.itemId) affectedItemIds.add(item.itemId.toString());
      });

      if (nonNahanItems.length === 0) {
        // All items were Rampur, delete the entire PI
        await db.collection('purchaseinvoices').deleteOne({ _id: pi._id });
        const res = await db.collection('storeinwardentries').deleteMany({ purchaseInvoiceId: pi._id });
        storeInwardDeletedCount += res.deletedCount;
        piDeletedCount++;
      } else {
        // Some items were Rampur, some were not. Update the PI.
        let subTotal = 0;
        let total = 0;
        let taxAmount = 0;

        nonNahanItems.forEach(item => {
          subTotal += (item.amount || 0);
          total += (item.totalAmount || item.amount || 0);
          taxAmount += ((item.totalAmount || item.amount || 0) - (item.amount || 0));
        });

        await db.collection('purchaseinvoices').updateOne(
          { _id: pi._id },
          { 
            $set: { 
              lineItems: nonNahanItems,
              subTotal: subTotal,
              total: total,
              taxAmount: taxAmount
            }
          }
        );

        // Delete only the store inward entries for the Rampur items in this PI
        const res = await db.collection('storeinwardentries').deleteMany({ 
          purchaseInvoiceId: pi._id,
          circle: { $regex: targetRegex }
        });
        storeInwardDeletedCount += res.deletedCount;
        piUpdatedCount++;
      }
    }

    console.log(`\n=== RESULTS ===`);
    console.log(`Entire PIs deleted (because all items were Rampur): ${piDeletedCount}`);
    console.log(`PIs updated (kept other circles, removed Rampur items): ${piUpdatedCount}`);
    console.log(`Store Inward Entries deleted: ${storeInwardDeletedCount}`);
    console.log(`Unique Items affected: ${affectedItemIds.size}`);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
