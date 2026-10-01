require('dotenv').config();
const mongoose = require('mongoose');

// We use ts-node to execute this, so we can import the controller function
const { processInwardStockUpdate } = require('./src/modules/store/inward.controller');
const { StoreInwardEntry } = require('./src/modules/store/storeInwardEntry.schema');

async function bulkApprove() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error('No MONGO_URI found');
    process.exit(1);
  }
  
  await mongoose.connect(uri);
  
  console.log("Fetching pending Rampur entries...");
  const pendingEntries = await StoreInwardEntry.find({
    circle: { $regex: /^rampur$/i },
    status: 'Pending Receipt'
  });

  console.log(`Found ${pendingEntries.length} pending entries. Starting bulk approval...`);
  
  let successCount = 0;
  for (const entry of pendingEntries) {
    try {
      entry.status = 'Approved';
      await entry.save();
      await processInwardStockUpdate(entry._id.toString());
      successCount++;
      if (successCount % 100 === 0) {
        console.log(`Approved ${successCount}/${pendingEntries.length}...`);
      }
    } catch (err) {
      console.error(`Error approving ${entry._id}:`, err);
    }
  }

  console.log(`\nSuccessfully approved ${successCount} entries and updated stock summaries!`);
  process.exit(0);
}

bulkApprove().catch(console.error);
