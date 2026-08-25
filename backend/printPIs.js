const mongoose = require('mongoose');
const uri = 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/test?appName=Cluster0';

async function run() {
  await mongoose.connect(uri);
  const PurchaseInvoice = mongoose.model('PurchaseInvoice', new mongoose.Schema({}, { strict: false }));
  
  const pis = await PurchaseInvoice.find({}).lean();
  let total = 0;
  pis.forEach(pi => {
    (pi.lineItems || []).forEach(li => {
      if (String(li.tempCode).trim() === '4') {
        const qty = Number(li.quantity || 0);
        total += qty;
        console.log(`PI ${pi.invoiceNumber} | Qty: ${qty} | Circle: ${li.circle || pi.circle} | Subcircle: ${li.subcircle || pi.subcircle}`);
      }
    });
  });
  console.log(`Total PI Qty: ${total}`);
  mongoose.disconnect();
}
run().catch(console.error);
