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

  const receiptsMap = {};
  const duplicateReceipts = [];

  for (const entry of rampurEntries) {
    const rNum = entry.receiptNumber || 'NO_RECEIPT_NUM';
    if (!receiptsMap[rNum]) {
      receiptsMap[rNum] = [];
    }
    receiptsMap[rNum].push(entry);
  }

  for (const rNum in receiptsMap) {
    if (receiptsMap[rNum].length > 1) {
      duplicateReceipts.push({
        receiptNumber: rNum,
        count: receiptsMap[rNum].length,
        ids: receiptsMap[rNum].map(e => e._id.toString())
      });
    }
  }

  if (duplicateReceipts.length > 0) {
    console.log(`\nFound ${duplicateReceipts.length} duplicate receipt numbers in Rampur data:`);
    duplicateReceipts.forEach(dup => {
      console.log(`- ${dup.receiptNumber}: ${dup.count} entries`);
    });
  } else {
    console.log(`\nNo double store receipts found for Rampur!`);
  }
  
  process.exit(0);
}

analyze().catch(console.error);
