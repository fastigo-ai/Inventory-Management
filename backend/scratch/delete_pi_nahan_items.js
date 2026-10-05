const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const MONGO_URI = process.env.MONGO_URI;

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;

    const nahanRegex = /^nahan$/i;
    
    // Find all PIs that have at least one line item in Nahan
    const pis = await db.collection('purchaseinvoices').find({
      "lineItems.circle": { $regex: nahanRegex }
    }).toArray();

    console.log(`Found ${pis.length} Purchase Invoices containing Nahan line items.`);

    let piDeletedCount = 0;
    let piUpdatedCount = 0;
    let storeInwardDeletedCount = 0;
    const affectedItemIds = new Set();

    for (const pi of pis) {
      const originalLineCount = pi.lineItems.length;
      
      const nahanItems = pi.lineItems.filter(item => item.circle && item.circle.match(nahanRegex));
      const nonNahanItems = pi.lineItems.filter(item => !(item.circle && item.circle.match(nahanRegex)));

      nahanItems.forEach(item => {
        if (item.itemId) affectedItemIds.add(item.itemId.toString());
      });

      if (nonNahanItems.length === 0) {
        // All items were Nahan, delete the entire PI
        await db.collection('purchaseinvoices').deleteOne({ _id: pi._id });
        const res = await db.collection('storeinwardentries').deleteMany({ purchaseInvoiceId: pi._id });
        storeInwardDeletedCount += res.deletedCount;
        piDeletedCount++;
      } else {
        // Some items were Nahan, some were not. Update the PI.
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

        // Delete only the store inward entries for the Nahan items in this PI
        const res = await db.collection('storeinwardentries').deleteMany({ 
          purchaseInvoiceId: pi._id,
          circle: { $regex: nahanRegex }
        });
        storeInwardDeletedCount += res.deletedCount;
        piUpdatedCount++;
      }
    }

    console.log(`\n=== RESULTS ===`);
    console.log(`Entire PIs deleted (because all items were Nahan): ${piDeletedCount}`);
    console.log(`PIs updated (kept other circles, removed Nahan items): ${piUpdatedCount}`);
    console.log(`Store Inward Entries deleted: ${storeInwardDeletedCount}`);
    console.log(`Unique Items affected: ${affectedItemIds.size}`);

    // Rebuild summaries if possible (if SummaryService is accessible here)
    console.log("To rebuild summaries for affected items, run the global rebuild script or wait for the cron.");

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
