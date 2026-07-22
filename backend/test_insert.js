const mongoose = require('mongoose');
const { StoreInwardEntry } = require('./src/modules/store/storeInwardEntry.schema');

async function run() {
  await mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/test?appName=Cluster0');
  
  try {
    const entry = {
      purchaseInvoiceId: new mongoose.Types.ObjectId(),
      vendorName: 'Vendor',
      invoiceNumber: 'INV-123',
      invoiceDate: new Date(),
      circle: 'Circle',
      package: 'Package',
      status: 'SUBMITTED'
    };
    
    await StoreInwardEntry.insertMany([entry]);
    console.log('Success!');
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
run();
