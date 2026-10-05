import mongoose from 'mongoose';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/test';

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;

    const items = await db.collection('items').find({ 'dynamicData.tempCode': '1' }).project({ _id: 1 }).toArray();
    const itemIds = items.map(i => i._id.toString());

    const pis = await db.collection('purchaseinvoices').find({ 
      'lineItems.itemId': { $in: items.map(i => i._id) } 
    }).toArray();
    
    console.log('--- Rampur PIs for tempCode 1 ---');
    const piMap = new Map();
    for (const pi of pis) {
      for (const line of pi.lineItems) {
        if (itemIds.includes(line.itemId.toString()) && (line.circle || '').toLowerCase() === 'rampur') {
          const key = `${pi.invoiceNumber || pi._id}`;
          if (!piMap.has(key)) piMap.set(key, 0);
          piMap.set(key, piMap.get(key) + Number(line.quantity || 0));
        }
      }
    }
    
    for (const [key, val] of piMap.entries()) {
      console.log(`PI ${key}: qty ${val}`);
    }

    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
run();
