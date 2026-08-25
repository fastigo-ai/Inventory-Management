const mongoose = require('mongoose');
const uri = 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/test?appName=Cluster0';

async function run() {
  await mongoose.connect(uri);
  const PurchaseInvoice = mongoose.model('PurchaseInvoice', new mongoose.Schema({}, { strict: false }));
  
  const piId = "6a8a05bb3b88abfdcfdb6b30";
  const pi = await PurchaseInvoice.findById(piId).lean();
  
  const items = pi.lineItems.filter(li => String(li.tempCode).trim() === '127');
  console.log(`Found ${items.length} line items for Temp Code 127 in PI ${pi.invoiceNumber}`);
  
  let totalQty = 0;
  items.forEach(li => {
    console.log(`  Qty: ${li.quantity}, SRT: ${li.srt}, Name: ${li.itemName}`);
    totalQty += Number(li.quantity || 0) + Number(li.srt || 0);
  });
  console.log(`Total PI Qty (including SRT): ${totalQty}`);

  mongoose.disconnect();
}
run().catch(console.error);
