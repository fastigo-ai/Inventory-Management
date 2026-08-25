const mongoose = require('mongoose');
const uri = 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/test?appName=Cluster0';

async function run() {
  await mongoose.connect(uri);
  const PurchaseInvoice = mongoose.model('PurchaseInvoice', new mongoose.Schema({}, { strict: false }));
  const StoreInwardEntry = mongoose.model('StoreInwardEntry', new mongoose.Schema({}, { strict: false }));

  const piId = "6a8a05bb3b88abfdcfdb6b30";
  const pi = await PurchaseInvoice.findById(piId).lean();
  console.log(`PI Number: ${pi.invoiceNumber}`);
  const lineItem = pi.lineItems.find(li => String(li.tempCode).trim() === '127');
  console.log(`PI Line Item Qty: ${lineItem.quantity}, SRT: ${lineItem.srt}`);

  const inwards = await StoreInwardEntry.find({ purchaseInvoiceId: piId, tempCode: '127', status: { $in: ['APPROVED', 'VERIFIED'] } }).lean();
  console.log(`\nFound ${inwards.length} Inward Entries for this PI:`);
  
  inwards.forEach(inw => {
    console.log(`  GRN: ${inw.grNumber}, Total Qty: ${inw.totalQty}, Invoice Qty: ${inw.invoiceQty}`);
  });

  mongoose.disconnect();
}
run().catch(console.error);
