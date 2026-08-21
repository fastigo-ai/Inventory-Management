import mongoose from 'mongoose';
import path from 'path';
import dotenv from 'dotenv';
import { StoreInwardEntry } from '../modules/store/storeInwardEntry.schema';
import { PurchaseInvoice } from '../modules/purchases/purchaseInvoice.schema';
import { PurchaseOrder } from '../modules/purchases/purchaseOrder.schema';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function checkInwardSources() {
  const mongoUri = process.env.MONGO_URI || '';
  await mongoose.connect(mongoUri);

  const total = await StoreInwardEntry.countDocuments();
  console.log(`Total StoreInwardEntry: ${total}`);

  const sample = await StoreInwardEntry.find().limit(20).lean();
  console.log('Sample inward entries:');
  for (const s of sample) {
    let pi = null;
    let po = null;
    if (s.purchaseInvoiceId) {
      pi = await PurchaseInvoice.findById(s.purchaseInvoiceId).lean();
    }
    if (s.purchaseOrderId) {
      po = await PurchaseOrder.findById(s.purchaseOrderId).lean();
    }
    console.log({
      inwardId: s.inwardId,
      itemName: s.itemName,
      tempCode: s.tempCode,
      serialNumber: s.serialNumber,
      circle: s.circle,
      package: s.package,
      invoiceNumber: s.invoiceNumber,
      hasPi: !!pi,
      piLineItems: pi?.lineItems?.map((li: any) => ({
        itemId: li.itemId,
        loaSerialNo: li.loaSerialNo,
        itemName: li.itemName,
        quantity: li.quantity
      })),
      hasPo: !!po,
      poLineItems: po?.lineItems?.map((li: any) => ({
        itemId: li.itemId,
        loaSerialNo: li.loaSerialNo,
        circle: li.circle,
        package: li.package,
        itemName: li.itemName,
        quantity: li.quantity
      }))
    });
  }

  await mongoose.disconnect();
}

checkInwardSources().catch(console.error);
