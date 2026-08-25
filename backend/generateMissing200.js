const mongoose = require('mongoose');
const uri = 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/test?appName=Cluster0';

async function run() {
  await mongoose.connect(uri);
  const StoreInwardEntry = mongoose.model('StoreInwardEntry', new mongoose.Schema({}, { strict: false }));
  const PurchaseInvoice = mongoose.model('PurchaseInvoice', new mongoose.Schema({}, { strict: false }));
  const Item = mongoose.model('Item', new mongoose.Schema({}, { strict: false }));

  const pi = await PurchaseInvoice.findById("6a8a05bb3b88abfdcfdb6b30");
  const itemId = "6a8990c3a215f565017f1c27";
  
  // Create an inward entry for the missing 200
  const entry = new StoreInwardEntry({
    inwardId: `INW-FIXED-${Date.now()}-200`,
    purchaseInvoiceId: pi._id,
    purchaseOrderId: pi.purchaseOrderId,
    poNumber: pi.poNumber || '-',
    poDate: pi.poDate || pi.date,
    billingFrom: pi.billingCompany?.name || '',
    vendorName: pi.vendorName,
    invoiceNumber: pi.invoiceNumber,
    invoiceDate: pi.date,
    receivedDate: new Date(),
    
    itemId: itemId,
    itemName: 'BOLT, NUT & WASHER',
    tempCode: '127',
    itemDescription: 'BOLT, NUT & WASHER',
    serialNumber: 'BOLT, NUT & WASHER',
    hsnCode: '',
    circle: pi.circle || 'Default',
    subcircle: pi.subcircle || '',
    package: pi.package || 'Default',
    unit: 'Nos',
    
    invoiceQty: 200,
    totalQty: 200,
    acceptedQty: 200,
    receivedQty: 200,
    challanQty: 0,
    rejectedQty: 0,
    
    rate: 0,
    amount: 0,
    taxableAmount: 0,
    cgst: 0,
    sgst: 0,
    igst: 0,
    gst: '0',
    
    status: 'APPROVED',
    packingList: [{
       packType: 'BOX',
       quantity: 200,
       packUnit: 'Nos'
    }]
  });

  await entry.save();
  console.log("Successfully generated missing 200 inward for TI/800.");
  mongoose.disconnect();
}
run().catch(console.error);
