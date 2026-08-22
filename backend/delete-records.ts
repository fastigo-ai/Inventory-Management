import mongoose from 'mongoose';
import { PurchaseInvoice } from './src/modules/purchases/purchaseInvoice.schema';
import { StoreInwardEntry } from './src/modules/store/storeInwardEntry.schema';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/erp-system');
  console.log('Connected to DB');
  
  const vendorName = 'Aggarwal Brothers';
  const invoiceNumbers = ['INV-01118', '999'];
  
  const invoices = await PurchaseInvoice.find({ 
    vendorName: vendorName, 
    invoiceNumber: { $in: invoiceNumbers } 
  });
  
  console.log('Found invoices to delete:', invoices.map(i => ({ id: i._id, num: i.invoiceNumber, vendor: i.vendorName })));
  
  const irs = await StoreInwardEntry.find({ 
    vendorName: vendorName, 
    invoiceNumber: { $in: invoiceNumbers } 
  });
  
  console.log('Found IRs to delete:', irs.map(i => ({ id: i._id, num: i.invoiceNumber, vendor: i.vendorName })));

  if (invoices.length > 0) {
    const invRes = await PurchaseInvoice.deleteMany({ 
      vendorName: vendorName, 
      invoiceNumber: { $in: invoiceNumbers } 
    });
    console.log('Deleted invoices:', invRes.deletedCount);
  }
  
  if (irs.length > 0) {
    const irRes = await StoreInwardEntry.deleteMany({ 
      vendorName: vendorName, 
      invoiceNumber: { $in: invoiceNumbers } 
    });
    console.log('Deleted IRs:', irRes.deletedCount);
  }

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
