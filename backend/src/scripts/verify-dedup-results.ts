import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import { SummaryService } from '../modules/reports/summary/summary.service';

async function verify() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || '');

  // Clear cache first
  SummaryService.clearCache();

  // Test Nahan
  const nahanRes = await SummaryService.fetchItemSummaries({ circle: 'Nahan', limit: '50' });
  console.log(`Nahan totalItems: ${nahanRes.totalItems}, returned items: ${nahanRes.items?.length}`);

  // Check first 10 items for Nahan
  console.log('\nNahan first 10 items:');
  const nahanSeen = new Set<string>();
  let nahanDups = 0;
  for (const it of nahanRes.items.slice(0, 10)) {
    console.log(`SR: ${it.loaSerialNo}, TC: ${it.tempCode}, Name: ${it.itemName}, Pkg: ${it.package}, Circ: ${it.circle}, DI: ${it.diQty}, Inv: ${it.invQty}`);
    const key = `${it.loaSerialNo}-${it.tempCode}-${it.itemName}`;
    if (nahanSeen.has(key)) {
      nahanDups++;
      console.log('  *** DUPLICATE DETECTED ***');
    }
    nahanSeen.add(key);
  }
  console.log(`Nahan duplicate count in first 10: ${nahanDups}`);

  // Test Rohru
  const rohruRes = await SummaryService.fetchItemSummaries({ circle: 'Rohru', limit: '50' });
  console.log(`\nRohru totalItems: ${rohruRes.totalItems}, returned items: ${rohruRes.items?.length}`);

  console.log('\nRohru first 10 items:');
  const rohruSeen = new Set<string>();
  let rohruDups = 0;
  for (const it of rohruRes.items.slice(0, 10)) {
    console.log(`SR: ${it.loaSerialNo}, TC: ${it.tempCode}, Name: ${it.itemName}, Pkg: ${it.package}, Circ: ${it.circle}, DI: ${it.diQty}, Inv: ${it.invQty}`);
    const key = `${it.loaSerialNo}-${it.tempCode}-${it.itemName}`;
    if (rohruSeen.has(key)) {
      rohruDups++;
      console.log('  *** DUPLICATE DETECTED ***');
    }
    rohruSeen.add(key);
  }
  console.log(`Rohru duplicate count in first 10: ${rohruDups}`);

  await mongoose.disconnect();
}
verify().catch(console.error);
