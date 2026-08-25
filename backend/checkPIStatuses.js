const mongoose = require('mongoose');
const uri = 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/test?appName=Cluster0';

async function run() {
  await mongoose.connect(uri);
  const PurchaseInvoice = mongoose.model('PurchaseInvoice', new mongoose.Schema({ status: String, invoiceNo: String, lineItems: Array }));
  
  const pis = await PurchaseInvoice.find({}).lean();
  let statusTotals = {};
  
  pis.forEach(pi => {
    let qty = 0;
    (pi.lineItems || []).forEach(li => {
      if (String(li.tempCode).trim() === '4') {
        qty += Number(li.quantity || 0);
      }
    });
    
    if (qty > 0) {
      statusTotals[pi.status] = (statusTotals[pi.status] || 0) + qty;
    }
  });

  console.log('RCC Muff Qty by PI Status:', statusTotals);

  mongoose.disconnect();
}
run().catch(console.error);
