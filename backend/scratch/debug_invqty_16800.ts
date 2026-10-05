import mongoose from 'mongoose';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/test';

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;
    const item = await db.collection('items').findOne({ 'dynamicData.tempCode': '1' });
    if (!item) { console.log('Not found'); process.exit(0); }

    // 1. ALL summary rows for this item
    console.log('=== ALL SUMMARY ROWS ===');
    const summaries = await db.collection('itemsummaries').find({ itemId: item._id }).toArray();
    let totalSummaryInvQty = 0;
    for (const s of summaries) {
      console.log(`circle: "${s.circle}", package: "${s.package}", invQty: ${s.invQty}, diQty: ${s.diQty}`);
      totalSummaryInvQty += (s.invQty || 0);
    }
    console.log(`TOTAL invQty across all summaries: ${totalSummaryInvQty}`);

    // 2. ALL actual PI quantities for this item across ALL circles
    console.log('\n=== ALL ACTUAL PI LINES ===');
    const pis = await db.collection('purchaseinvoices').find({ 'lineItems.itemId': item._id }).toArray();
    let totalActualPiQty = 0;
    const byCircle: Record<string, number> = {};
    for (const pi of pis) {
      for (const line of pi.lineItems) {
        if (line.itemId.toString() === item._id.toString()) {
          const qty = Number(line.quantity) || 0;
          totalActualPiQty += qty;
          const circ = line.circle || 'Unknown';
          byCircle[circ] = (byCircle[circ] || 0) + qty;
        }
      }
    }
    console.log('By circle:', JSON.stringify(byCircle, null, 2));
    console.log(`TOTAL actual PI qty: ${totalActualPiQty}`);

    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
run();
