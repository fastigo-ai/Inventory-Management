import mongoose from 'mongoose';
import path from 'path';
import dotenv from 'dotenv';
import { StoreInwardEntry } from '../modules/store/storeInwardEntry.schema';
import { DI } from '../modules/di/di.schema';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function checkInwardDiLinks() {
  const mongoUri = process.env.MONGO_URI || '';
  await mongoose.connect(mongoUri);

  const sample = await StoreInwardEntry.find({
    itemName: /STP 9 MTR/i
  }).limit(15).lean();

  console.log(`Checking ${sample.length} sample STP 9 MTR Inward entries:`);
  for (const s of sample) {
    let di = null;
    if (s.diId) {
      di = await DI.findById(s.diId).lean();
    } else if (s.diRefNo) {
      di = await DI.findOne({ diNumber: s.diRefNo }).lean();
    }

    console.log({
      inwardId: s.inwardId,
      circle: s.circle,
      invoiceNumber: s.invoiceNumber,
      diRefNo: s.diRefNo,
      hasDi: !!di,
      diNumber: di?.diNumber,
      diCircle: di?.circle,
      diLineItemLoas: di?.lineItems?.map((li: any) => ({
        itemId: li.itemId,
        loaSerialNo: li.loaSerialNo,
        itemName: li.itemName,
        quantity: li.quantity
      }))
    });
  }

  await mongoose.disconnect();
}

checkInwardDiLinks().catch(console.error);
