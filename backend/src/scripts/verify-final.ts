import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import { SummaryService } from '../modules/reports/summary/summary.service';

async function verify() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || '');
  SummaryService.clearCache();

  // Test Nahan
  const nahanRes = await SummaryService.fetchItemSummaries({ circle: 'Nahan', limit: '50000' });
  console.log('Nahan totalItems:', nahanRes.pagination?.totalItems, 'items returned:', nahanRes.items?.length);

  // Check if any itemId appears more than once in Nahan
  const idMap = new Map<string, any[]>();
  for (const it of nahanRes.items) {
    const key = it.itemId?.toString();
    if (!idMap.has(key)) idMap.set(key, []);
    idMap.get(key)!.push(it);
  }

  let dupCount = 0;
  for (const [id, docs] of idMap.entries()) {
    if (docs.length > 1) {
      dupCount++;
      console.log(`Duplicate itemId ${id}:`, docs.map(d => ({ sr: d.loaSerialNo, tc: d.tempCode, name: d.itemName, di: d.diQty, inv: d.invQty })));
    }
  }
  console.log(`Total duplicate itemIds in Nahan: ${dupCount}`);

  // Test Rohru
  const rohruRes = await SummaryService.fetchItemSummaries({ circle: 'Rohru', limit: '50000' });
  console.log('Rohru totalItems:', rohruRes.pagination?.totalItems, 'items returned:', rohruRes.items?.length);

  const rohruIdMap = new Map<string, any[]>();
  for (const it of rohruRes.items) {
    const key = it.itemId?.toString();
    if (!rohruIdMap.has(key)) rohruIdMap.set(key, []);
    rohruIdMap.get(key)!.push(it);
  }

  let rohruDupCount = 0;
  for (const [id, docs] of rohruIdMap.entries()) {
    if (docs.length > 1) {
      rohruDupCount++;
    }
  }
  console.log(`Total duplicate itemIds in Rohru: ${rohruDupCount}`);

  // Also check if any item in Rohru has invQty > diQty
  let piGtDi = 0;
  for (const it of rohruRes.items) {
    if ((it.invQty || 0) > (it.diQty || 0)) {
      piGtDi++;
      console.log(`PI > DI in Rohru: ${it.tempCode} - ${it.itemName}: PI=${it.invQty}, DI=${it.diQty}`);
    }
  }
  console.log(`Total items where PI > DI in Rohru: ${piGtDi}`);

  await mongoose.disconnect();
}
verify().catch(console.error);
