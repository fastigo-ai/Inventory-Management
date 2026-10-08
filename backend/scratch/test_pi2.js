const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  const pis = await mongoose.connection.db.collection('purchaseinvoices').find({}).toArray();
  let totalValue = 0;
  let totalSubTotal = 0;
  let totalGrandTotal = 0;
  let lineItemsAmount = 0;
  pis.forEach(p => {
    totalValue += (p.total || 0);
    totalSubTotal += (p.subTotal || 0);
    totalGrandTotal += (p.grandTotal || 0);
    p.lineItems?.forEach(l => {
      lineItemsAmount += (l.amount || 0);
    });
  });
  console.log({ totalValue, totalSubTotal, totalGrandTotal, lineItemsAmount });
  process.exit(0);
}
run();
