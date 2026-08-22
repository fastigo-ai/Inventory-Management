const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to remote DB');
  
  const PurchaseInvoice = mongoose.model('PurchaseInvoice', new mongoose.Schema({}, { strict: false }));
  const StoreInwardEntry = mongoose.model('StoreInwardEntry', new mongoose.Schema({}, { strict: false }));
  
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
  } else {
    console.log('No invoices found to delete.');
  }
  
  if (irs.length > 0) {
    const irRes = await StoreInwardEntry.deleteMany({ 
      vendorName: vendorName, 
      invoiceNumber: { $in: invoiceNumbers } 
    });
    console.log('Deleted IRs:', irRes.deletedCount);
  } else {
    console.log('No IRs found to delete.');
  }

  process.exit(0);
}

run().catch(console.error);
