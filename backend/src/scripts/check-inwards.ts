import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

import { StoreInwardEntry } from '../modules/store/storeInwardEntry.schema';

async function checkInwards() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/inventory-management');
    console.log('Connected.');

    const query1 = { circle: { $regex: /solan/i } };
    const count1 = await StoreInwardEntry.countDocuments(query1);
    console.log(`Inwards with circle matching 'solan': ${count1}`);

    const query2 = { subcircle: { $regex: /kumarhatti/i } };
    const count2 = await StoreInwardEntry.countDocuments(query2);
    console.log(`Inwards with subcircle matching 'kumarhatti': ${count2}`);
    
    const query3 = { circle: { $regex: /kumarhatti/i } };
    const count3 = await StoreInwardEntry.countDocuments(query3);
    console.log(`Inwards with circle matching 'kumarhatti': ${count3}`);

    const query4 = { circle: { $regex: /solan/i }, subcircle: { $regex: /kumarhatti/i } };
    const count4 = await StoreInwardEntry.countDocuments(query4);
    console.log(`Inwards with circle 'solan' AND subcircle 'kumarhatti': ${count4}`);

    if (count4 > 0) {
        const sample = await StoreInwardEntry.findOne(query4).select('invoiceNumber vendorName circle subcircle itemDescription totalQty');
        console.log('Sample entry:', sample);
    } else if (count3 > 0) {
        const sample = await StoreInwardEntry.findOne(query3).select('invoiceNumber vendorName circle subcircle itemDescription totalQty');
        console.log('Sample entry with circle = kumarhatti:', sample);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkInwards();
