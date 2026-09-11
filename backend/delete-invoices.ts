import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });
import { StoreInwardEntry } from './src/modules/store/storeInwardEntry.schema';
import { PurchaseInvoice } from './src/modules/purchases/purchaseInvoice.schema';

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/inventory-management');
    console.log('Connected to DB');

    const resultInward = await StoreInwardEntry.deleteMany({
      _id: { $in: ['6aa29393e5072e54c467d5e0', '6aa29393e5072e54c467d5e2'] }
    });
    console.log(`Deleted ${resultInward.deletedCount} StoreInwardEntries.`);

    const resultPurchase = await PurchaseInvoice.deleteMany({
      _id: '6aa29393e5072e54c467d5db'
    });
    console.log(`Deleted ${resultPurchase.deletedCount} PurchaseInvoice.`);

  } catch (error) {
    console.error('Error deleting records:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
