const mongoose = require('mongoose');
const uri = 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/test?appName=Cluster0';

async function run() {
  await mongoose.connect(uri);
  const ContractorInvoice = mongoose.model('ContractorInvoice', new mongoose.Schema({}, { strict: false }));
  
  const cis = await ContractorInvoice.find({}).lean();
  let total = 0;
  cis.forEach(ci => {
    (ci.items || ci.lineItems || []).forEach(li => {
      if (String(li.tempCode).trim() === '4') {
        total += Number(li.quantity || li.qty || 0);
      }
    });
  });
  console.log(`Total ContractorInvoice Qty for RCC Muff: ${total}`);
  mongoose.disconnect();
}
run().catch(console.error);
