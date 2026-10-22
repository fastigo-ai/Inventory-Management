import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import { SummaryService } from '../modules/reports/summary/summary.service';

async function rebuildAllRohru() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || '');
  const db = mongoose.connection.db!;

  const rohruItems = await db.collection('items').find({
    'dynamicData.circle': /rohru/i,
    isDeleted: { $ne: true }
  }).toArray();

  console.log(`Starting rebuild for all ${rohruItems.length} items in Rohru circle...`);
  const t0 = Date.now();
  
  const CHUNK_SIZE = 5;
  for (let i = 0; i < rohruItems.length; i += CHUNK_SIZE) {
    const chunk = rohruItems.slice(i, i + CHUNK_SIZE);
    await Promise.all(
      chunk.map(it => SummaryService.rebuildForItem(it._id.toString()).catch(err => {
        console.error(`Error rebuilding item ${it._id}:`, err.message);
      }))
    );
    if ((i + CHUNK_SIZE) % 50 === 0 || i + CHUNK_SIZE >= rohruItems.length) {
      console.log(`Rebuilt ${Math.min(i + CHUNK_SIZE, rohruItems.length)} / ${rohruItems.length} items (${Math.round((Date.now() - t0) / 1000)}s)...`);
    }
  }

  // Clear in-memory cache
  SummaryService.clearCache();
  console.log(`\nSuccessfully rebuilt all ${rohruItems.length} Rohru items in ${Math.round((Date.now() - t0) / 1000)}s.`);

  // Verify Rohru summary totals
  const summaries = await db.collection('itemsummaries').find({ circle: /rohru/i }).toArray();
  let totalDi = 0;
  let totalInv = 0;
  let totalLoa = 0;
  let totalBom = 0;
  let piGtDiCount = 0;

  for (const s of summaries) {
    totalDi += (s.diQty || 0);
    totalInv += (s.invQty || 0);
    totalLoa += (s.loaQty || 0);
    totalBom += (s.bomQty || 0);
    if ((s.invQty || 0) > (s.diQty || 0)) {
      piGtDiCount++;
    }
  }

  console.log('\n--- Rohru Summary Verification ---');
  console.log({
    totalItems: summaries.length,
    totalLoa,
    totalBom,
    totalDi,
    totalInv,
    piGtDiCount
  });

  await mongoose.disconnect();
}
rebuildAllRohru().catch(console.error);
