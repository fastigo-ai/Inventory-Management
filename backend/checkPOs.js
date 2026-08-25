const mongoose = require('mongoose');
const uri = 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/test?appName=Cluster0';

async function run() {
  await mongoose.connect(uri);
  const PurchaseOrder = mongoose.model('PurchaseOrder', new mongoose.Schema({}, { strict: false }));
  
  const pos = await PurchaseOrder.find({}).lean();
  let total = 0;
  pos.forEach(po => {
    (po.lineItems || []).forEach(li => {
      if (String(li.tempCode).trim() === '4') {
        total += Number(li.quantity || li.qty || 0);
      }
    });
  });
  console.log(`Total PurchaseOrder Qty for RCC Muff: ${total}`);
  mongoose.disconnect();
}
run().catch(console.error);
