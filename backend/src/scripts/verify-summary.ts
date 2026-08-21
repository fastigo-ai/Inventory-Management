import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

import Item from '../modules/items/item.model';
import { ItemSummary } from '../modules/reports/summary/summary.schema';

async function main() {
  await mongoose.connect(process.env.MONGO_URI!);
  const items: any[] = await Item.find({ 'dynamicData.name': /STP 9 MTR/i }).lean();
  console.log('Found ' + items.length + ' master items for STP 9 MTR');
  
  const ids = items.map(i => i._id);
  const summaries: any[] = await ItemSummary.find({ itemId: { $in: ids } }).lean();
  console.log('Summaries count:', summaries.length);
  const rows = summaries.map(s => {
    return {
      loaSerialNo: s.loaSerialNo,
      circle: s.circle,
      package: s.package,
      loaQty: s.loaQty,
      bomQty: s.bomQty,
      diQty: s.diQty,
      mrhovQty: s.invQty,
      actQty: s.actQty
    };
  }).filter(r => r.diQty > 0 || r.mrhovQty > 0 || r.actQty > 0);

  rows.sort((a, b) => (Number(a.loaSerialNo) || 0) - (Number(b.loaSerialNo) || 0) || (a.circle || '').localeCompare(b.circle || ''));
  console.log(`Total non-zero rows for STP 9 MTR: ${rows.length}`);
  console.table(rows);

  await mongoose.disconnect();
}
main().catch(err => {
  console.error(err);
  process.exit(1);
});
