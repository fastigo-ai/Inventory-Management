import mongoose from 'mongoose';
import path from 'path';
import dotenv from 'dotenv';
import { SummaryService } from '../src/modules/reports/summary/summary.service';

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
    
    console.log(`Rebuilding summary for ${item.dynamicData.name} instantly...`);
    await SummaryService.rebuildForItem(item._id.toString());
    
    const summary = await db.collection('itemsummaries').findOne({ itemId: item._id, circle: { $regex: /^nahan$/i } });
    console.log('Successfully rebuilt! New DI Qty for Nahan:', summary.diQty);
    
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

run();
