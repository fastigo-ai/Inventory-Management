import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import { SummaryService } from '../modules/reports/summary/summary.service';

async function test() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || '');
  console.log('Rebuilding LOA 10 (6a8299015d7ee9d212355263)...');
  await SummaryService.rebuildForItem('6a8299015d7ee9d212355263');
  const s = await mongoose.connection.db!.collection('itemsummaries').findOne({ itemId: new mongoose.Types.ObjectId('6a8299015d7ee9d212355263') });
  console.log('Result after rebuild:', {
    itemName: s?.itemName,
    loaSerialNo: s?.loaSerialNo,
    circle: s?.circle,
    package: s?.package,
    diQty: s?.diQty,
    invQty: s?.invQty,
    billedQty: s?.billedQty,
    loaQty: s?.loaQty,
    bomQty: s?.bomQty
  });
  await mongoose.disconnect();
}
test().catch(console.error);
