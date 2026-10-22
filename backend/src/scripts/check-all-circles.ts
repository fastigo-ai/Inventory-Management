import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import { SummaryService } from '../modules/reports/summary/summary.service';

async function checkAll() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || '');
  SummaryService.clearCache();
  for (const c of ['Solan', 'Nahan', 'Rampur', 'Rohru']) {
    const res = await SummaryService.fetchItemSummaries({ circle: c, limit: '50000' });
    const seen = new Set();
    let dups = 0;
    for (const it of res.items) {
      const id = it.itemId?.toString();
      if (seen.has(id)) dups++;
      seen.add(id);
    }
    console.log(`${c} total: ${res.pagination?.totalItems}, duplicates: ${dups}`);
  }
  await mongoose.disconnect();
}
checkAll().catch(console.error);
