import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

import { ContractorReturn } from '../modules/contractors/contractorReturn.schema';
import { SummaryService } from '../modules/reports/summary/summary.service';

async function rebuild() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/inventory-management');
    console.log('Connected.');

    const affectedItemIds = new Set<string>();

    const returns = await ContractorReturn.find({});
    for (const r of returns) {
      r.lineItems?.forEach((li: any) => {
        if (li.itemId) affectedItemIds.add(li.itemId.toString());
      });
    }

    console.log(`Found ${affectedItemIds.size} unique items in Contractor Returns. Rebuilding stock...`);

    let count = 0;
    for (const itemId of Array.from(affectedItemIds)) {
      await SummaryService.rebuildForItem(itemId);
      count++;
      if (count % 10 === 0) console.log(`Rebuilt ${count} items...`);
    }

    console.log('Done rebuilding stock.');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

rebuild();
