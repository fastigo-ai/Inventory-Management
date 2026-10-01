require('dotenv').config();
const mongoose = require('mongoose');

async function analyze() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error('No MONGO_URI found');
    process.exit(1);
  }
  
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const entries = db.collection('storeinwardentries');

  const rampurEntries = await entries.find({
    circle: { $regex: /^rampur$/i }
  }).toArray();
  
  console.log(`Total Rampur Inward Entries found: ${rampurEntries.length}`);

  const map = {};
  const duplicates = [];

  for (const entry of rampurEntries) {
    const key = `${entry.diRefNo || entry.diId}_${entry.tempCode || entry.itemId}`;
    if (!map[key]) {
      map[key] = [];
    }
    map[key].push(entry);
  }

  for (const key in map) {
    if (map[key].length > 1) {
      duplicates.push({
        key,
        count: map[key].length,
        items: map[key].map(e => ({ id: e._id.toString(), qty: e.totalQty || e.invoiceQty, invoice: e.invoiceNumber }))
      });
    }
  }

  if (duplicates.length > 0) {
    console.log(`\nFound ${duplicates.length} items with multiple inward entries (potential double receipts):`);
    duplicates.forEach(dup => {
      console.log(`- ${dup.key}: ${dup.count} entries`);
      dup.items.forEach(it => console.log(`    -> ID: ${it.id} | Qty: ${it.qty} | Invoice: ${it.invoice}`));
    });
  } else {
    console.log(`\nNo double store receipts found for Rampur! (Based on di/item grouping)`);
  }
  
  process.exit(0);
}

analyze().catch(console.error);
