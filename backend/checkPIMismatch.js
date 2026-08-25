const mongoose = require('mongoose');
const uri = 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/test?appName=Cluster0';

async function run() {
  await mongoose.connect(uri);
  const PurchaseInvoice = mongoose.model('PurchaseInvoice', new mongoose.Schema({}, { strict: false }));
  
  const pis = await PurchaseInvoice.find({}).lean();
  let qtySum = 0;

  pis.forEach(pi => {
    (pi.lineItems || []).forEach(li => {
      if (String(li.tempCode).trim() === '4') {
        qtySum += Number(li.quantity || 0);
        
        const q = Number(li.quantity || 0);
        const srt = Number(li.srt || 0);
        if (q !== srt) {
          console.log(`Mismatch PI ${pi.invoiceNumber}: q=${q}, srt=${srt}`);
        }
      }
    });
  });

  console.log(`Total Qty Now: ${qtySum}`);
  mongoose.disconnect();
}
run().catch(console.error);
