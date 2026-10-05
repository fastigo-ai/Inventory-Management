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
    const itemIds = items.map(i => i._id);

    const summaries = await db.collection('itemsummaries').find({ 
      itemId: { $in: itemIds },
      circle: { $regex: /^rampur$/i }
    }).toArray();
    
    console.log('--- Rampur Summaries ---');
    for (const s of summaries) {
      console.log(`package: "${s.package}", loaQty: ${s.loaQty}, diQty: ${s.diQty}, invQty: ${s.invQty}`);
    }

    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
run();
