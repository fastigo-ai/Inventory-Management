const mongoose = require('mongoose');
const uri = 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/test?appName=Cluster0';

async function run() {
  await mongoose.connect(uri);
  const PurchaseInvoice = mongoose.model('PurchaseInvoice', new mongoose.Schema({}, { strict: false }));
  
  const pis = await PurchaseInvoice.find({ status: { $ne: 'Cancelled' } }).lean();
  let qtySum = 0;
  let srtSum = 0;

  pis.forEach(pi => {
    (pi.lineItems || []).forEach(li => {
      if (String(li.tempCode).trim() === '4') {
        qtySum += Number(li.quantity || 0);
        srtSum += Number(li.srt || 0);
      }
    });
  });

  console.log(`Total Quantity: ${qtySum}`);
  console.log(`Total SRT: ${srtSum}`);
  mongoose.disconnect();
}
run().catch(console.error);
