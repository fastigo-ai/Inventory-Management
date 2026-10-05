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
    const summaries = await db.collection('itemsummaries').find({ itemId: item._id, circle: { $regex: /^nahan$/i } }).toArray();
    for (const s of summaries) {
      console.log({ circle: s.circle, package: s.package, diQty: s.diQty, invQty: s.invQty, loaQty: s.loaQty });
    }
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
run();
