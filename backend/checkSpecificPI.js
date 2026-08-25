const mongoose = require('mongoose');
const uri = 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/test?appName=Cluster0';

async function run() {
  await mongoose.connect(uri);
  const PurchaseInvoice = mongoose.model('PurchaseInvoice', new mongoose.Schema({}, { strict: false }));
  
  const pi = await PurchaseInvoice.findById("6a8a05aa3b88abfdcfdb682f").lean();
  console.log(JSON.stringify(pi, null, 2));
  
  mongoose.disconnect();
}
run().catch(console.error);
