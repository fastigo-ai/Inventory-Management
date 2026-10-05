import mongoose from 'mongoose';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/test';

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;
    
    // 1. Get the itemId for tempCode 1
    const item = await db.collection('items').findOne({ 'dynamicData.tempCode': '1' });
    if (!item) {
      console.log('Item with tempCode 1 not found');
      process.exit(0);
    }
    console.log('Found item:', item.dynamicData.name);

    // 2. Check the ItemSummary for Nahan
    const summary = await db.collection('itemsummaries').findOne({ itemId: item._id, circle: { $regex: /^nahan$/i } });
    console.log('Summary diQty:', summary ? summary.diQty : 'No summary found');

    // 3. Calculate the actual DI qty from the DI collection
    const dis = await db.collection('dis').find({ 'lineItems.itemId': item._id }).toArray();
    let actualDiQty = 0;
    for (const di of dis) {
      for (const line of di.lineItems) {
        if (line.itemId.toString() === item._id.toString() && line.circle && line.circle.toLowerCase() === 'nahan') {
          actualDiQty += (Number(line.quantity) || 0);
        }
      }
    }
    console.log('Actual DI Qty calculated from DI documents:', actualDiQty);
    
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

run();
