import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { StoreInwardEntry } from '../src/modules/store/storeInwardEntry.schema';
import { processInwardStockUpdate } from '../src/modules/store/store.controller';

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI as string);
    console.log('Connected to DB');

    const pendingEntries = await StoreInwardEntry.find({ status: 'PENDING_RECEIPT' });
    console.log(`Found ${pendingEntries.length} pending entries.`);

    let count = 0;
    const today = new Date();

    for (const entry of pendingEntries) {
      // Automatically generate a GRN number and set date
      const grNumber = `GRN-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
      
      entry.status = 'APPROVED'; // Mark as done/approved
      entry.grNumber = grNumber;
      entry.receivedDate = today;
      entry.inwardDate = today;

      // Make sure receivedQty matches invoiceQty for bulk auto-GRN
      if (!entry.receivedQty) {
        entry.receivedQty = entry.invoiceQty || 0;
      }

      await entry.save();

      // Process the stock update which does all the heavy lifting (adding to inventory, purchase history, etc)
      await processInwardStockUpdate(entry._id.toString());
      
      count++;
      if (count % 100 === 0) {
        console.log(`Processed ${count}/${pendingEntries.length} entries...`);
      }
    }

    console.log(`Success! Automatically generated GRN for ${count} items.`);
    process.exit(0);
  } catch (error) {
    console.error('Error during bulk GRN generation:', error);
    process.exit(1);
  }
}

run();
