const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  
  const d = await mongoose.connection.db.collection('dis').findOne({ diNumber: '14687-721' });
  const pis = await mongoose.connection.db.collection('purchaseinvoices').find({ "lineItems.diId": d._id }).toArray();
  
  console.log(`Found ${pis.length} PIs for DI 14687-721`);
  pis.forEach(pi => {
      let totalQty = 0;
      pi.lineItems?.forEach(line => {
          if (line.diId && line.diId.toString() === d._id.toString()) {
              totalQty += Number(line.quantity) || Number(line.invoiceQuantity) || 0;
          }
      });
      console.log(`PI: ${pi.invoiceNumber} | Qty: ${totalQty}`);
  });
  
  process.exit(0);
}
run();
