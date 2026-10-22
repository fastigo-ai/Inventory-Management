import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import { SummaryService } from '../modules/reports/summary/summary.service';

async function testBatch() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || '');
  const db = mongoose.connection.db!;

  // Let's test rebuilding items 4 through 15 (page 1 items)
  const targetLoas = ['4', '5', '6', '7', '8', '9', '11', '12', '13'];
  const items = await db.collection('items').find({
    'dynamicData.circle': /rohru/i,
    'dynamicData.loaSerialNo': { $in: targetLoas }
  }).toArray();

  console.log(`Found ${items.length} items to test...`);
  const t0 = Date.now();
  for (const it of items) {
    await SummaryService.rebuildForItem(it._id.toString());
    const s = await db.collection('itemsummaries').findOne({ itemId: it._id });
    console.log(`Rebuilt LOA ${it.dynamicData?.loaSerialNo}: DI=${s?.diQty}, Inv=${s?.invQty}, Billed=${s?.billedQty}, Loa=${s?.loaQty}`);
  }
  console.log(`Completed ${items.length} items in ${Date.now() - t0} ms`);

  await mongoose.disconnect();
}
testBatch().catch(console.error);
