import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });
import { StoreInwardEntry } from './src/modules/store/storeInwardEntry.schema';
import { PurchaseInvoice } from './src/modules/purchases/purchaseInvoice.schema';
import { ClientBill } from './src/modules/client-billing/clientBill.schema';

async function run() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/inventory-management');
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const inwardInvoices = await StoreInwardEntry.find({ createdAt: { $gte: today } }).lean();
  console.log(`Store Inward Entries today: ${inwardInvoices.length}`);
  for (const entry of inwardInvoices) {
    console.log(`- ID: ${entry._id} | InvoiceNo: ${entry.invoiceNumber || entry.diNumber || 'N/A'} | Circle: ${entry.circle || 'N/A'}`);
  }

  const purchaseInvoices = await PurchaseInvoice.find({ createdAt: { $gte: today } }).lean();
  console.log(`\nPurchase Invoices today: ${purchaseInvoices.length}`);
  for (const inv of purchaseInvoices) {
    console.log(`- ID: ${inv._id} | InvoiceNo: ${inv.invoiceNumber} | Circle: ${inv.circle || 'N/A'}`);
  }

  const cb = await ClientBill.find({ createdAt: { $gte: today } }).lean();
  console.log(`\nClient Billing Invoices today: ${cb.length}`);
  for (const inv of cb) {
    console.log(`- ID: ${inv._id} | InvoiceNo: ${(inv as any).billingNumber || (inv as any).invoiceNumber} | Circle: ${inv.circle || 'N/A'}`);
  }

  process.exit(0);
}

run();
