const mongoose = require('mongoose');
const uri = 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/test?appName=Cluster0';

async function run() {
  await mongoose.connect(uri);

  const PurchaseInvoice = mongoose.model('PurchaseInvoice', new mongoose.Schema({ status: String, lineItems: Array }));
  const StoreInwardEntry = mongoose.model('StoreInwardEntry', new mongoose.Schema({ status: String, lineItems: Array, tempCode: String, totalQty: Number, invoiceQty: Number, receivedQty: Number, acceptedQty: Number }));
  
  // PI (Vendor Summary)
  const pis = await PurchaseInvoice.find({ status: { $ne: 'Cancelled' } }).lean();
  let piQty = 0;
  pis.forEach(pi => {
    (pi.lineItems || []).forEach(li => {
      if (String(li.tempCode).trim() === '4') {
        piQty += Number(li.quantity || 0);
      }
    });
  });

  // Store Inwards (Store Itemised Summary)
  const inwards = await StoreInwardEntry.find().lean();
  let inwardQty = 0;
  inwards.forEach(inw => {
    if (String(inw.tempCode).trim() === '4') {
      inwardQty += Number(inw.totalQty || inw.invoiceQty || inw.acceptedQty || inw.receivedQty || 0);
    }
  });

  console.log('Total PI Qty (Vendor Summary logic):', piQty);
  console.log('Total Inward Qty (Store Summary logic):', inwardQty);

  mongoose.disconnect();
}
run().catch(console.error);
