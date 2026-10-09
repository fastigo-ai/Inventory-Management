import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const DB_URI = process.env.MONGO_URI || 'mongodb+srv://admin:pass@ac-clx6mva-shard-00-00.lgbl4nv.mongodb.net/fastigo-inventory?retryWrites=true&w=majority';

async function main() {
  await mongoose.connect(DB_URI);
  const { DI } = await import('../src/modules/di/di.schema');
  const di = await DI.findOne({ diNumber: '21058-86' });
  if (di) {
    const item = di.lineItems.find((li: any) => li.loaSerialNo === '2051' && li.itemName.includes('GI STAY WIRE'));
    console.log(`\nDI 21058-86, LOA 2051:`);
    console.log(`ItemId: ${item?.itemId}`);
    console.log(`Quantity: ${item?.quantity}, mhrovDoneQty: ${item?.mhrovDoneQty}`);
  }
  process.exit(0);
}

main().catch(console.error);
