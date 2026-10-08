const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  const pis = await mongoose.connection.db.collection('purchaseinvoices').find({ "lineItems.amount": { $gt: 0 } }).limit(1).toArray();
  console.log("PIs with lineItems.amount > 0:", pis.length);
  if (pis.length > 0) console.log(JSON.stringify(pis[0].lineItems[0], null, 2));

  const pis2 = await mongoose.connection.db.collection('purchaseinvoices').find({ "total": { $gt: 0 } }).limit(1).toArray();
  console.log("PIs with total > 0:", pis2.length);
  if (pis2.length > 0) {
    console.log("total =", pis2[0].total);
    console.log("grandTotal =", pis2[0].grandTotal);
  }
  process.exit(0);
}
run();
