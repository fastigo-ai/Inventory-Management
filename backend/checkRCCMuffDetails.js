const mongoose = require('mongoose');
const uri = 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/test?appName=Cluster0';

async function run() {
  await mongoose.connect(uri);
  const PurchaseInvoice = mongoose.model('PurchaseInvoice', new mongoose.Schema({ status: String, invoiceNo: String, lineItems: Array }));
  const StoreInwardEntry = mongoose.model('StoreInwardEntry', new mongoose.Schema({ status: String, invoiceNo: String, lineItems: Array, tempCode: String, totalQty: Number }));

  const pis = await PurchaseInvoice.find({ status: { $ne: 'Cancelled' } }).lean();
  let piInvoices = [];
  pis.forEach(pi => {
    (pi.lineItems || []).forEach(li => {
      if (String(li.tempCode).trim() === '4') {
        piInvoices.push({ invoiceNo: pi.invoiceNo, qty: Number(li.quantity || 0) });
      }
    });
  });

  const inwards = await StoreInwardEntry.find().lean();
  let inwardInvoices = [];
  inwards.forEach(inw => {
    if (String(inw.tempCode).trim() === '4') {
      inwardInvoices.push({ invoiceNo: inw.invoiceNo, qty: Number(inw.totalQty || 0) });
    }
  });

  console.log('--- PI Invoices for Temp Code 4 ---');
  piInvoices.forEach(i => console.log(`Invoice: ${i.invoiceNo}, Qty: ${i.qty}`));

  console.log('\n--- Store Inward Invoices for Temp Code 4 ---');
  inwardInvoices.forEach(i => console.log(`Invoice: ${i.invoiceNo}, Qty: ${i.qty}`));

  mongoose.disconnect();
}
run().catch(console.error);
