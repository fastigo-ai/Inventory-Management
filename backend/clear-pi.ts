import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();

import { PurchaseInvoice } from './src/modules/purchases/purchaseInvoice.schema';
import { StoreInwardEntry } from './src/modules/store/storeInwardEntry.schema';

async function clearPI() {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) throw new Error('No MONGO_URI');
    await mongoose.connect(uri);
    console.log('Connected to DB');

    await mongoose.connection.collection('documentrelations').deleteMany({
      $or: [
        { sourceType: 'PurchaseInvoice' },
        { targetType: 'PurchaseInvoice' }
      ]
    });
    console.log('Cleared Relations');
    
    const piModel = PurchaseInvoice || mongoose.model('PurchaseInvoice');
    await piModel.deleteMany({});
    
    const siModel = StoreInwardEntry || mongoose.model('StoreInwardEntry');
    const siRes = await siModel.deleteMany({ purchaseInvoiceId: { $exists: true } });
    console.log('Deleted PIs and ' + siRes.deletedCount + ' Store Inward Entries.');

    await mongoose.disconnect();
    console.log('Done.');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
clearPI();
