import mongoose from 'mongoose';
import path from 'path';
import dotenv from 'dotenv';
import { ItemSummary } from '../src/modules/reports/summary/summary.schema';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/test';

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    
    // Nahan and Rohru should have 0 for invQty, srtQty, actQty, billedQty 
    // because all Purchase Invoices for these circles were wiped
    
    const resNahan = await ItemSummary.updateMany(
      { circle: { $regex: /^nahan$/i } },
      { $set: { invQty: 0, srtQty: 0, actQty: 0, billedQty: 0 } }
    );
    console.log(`Reset Nahan summaries: ${resNahan.modifiedCount} records updated.`);

    const resRohru = await ItemSummary.updateMany(
      { circle: { $regex: /^rohru$/i } },
      { $set: { invQty: 0, srtQty: 0, actQty: 0, billedQty: 0 } }
    );
    console.log(`Reset Rohru summaries: ${resRohru.modifiedCount} records updated.`);

    console.log('Instant zeroing out completed!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
