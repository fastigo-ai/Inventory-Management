const mongoose = require('mongoose');
const MONGODB_URI = "mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0";

async function huntPIAnywhere() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  const pis = await db.collection('purchaseinvoices').find({
    "items.itemName": { $regex: /MS ANGLE 50X50X6/i }
  }).toArray();
  
  let totalPI = 0;
  pis.forEach(pi => {
    console.log(`Found PI: ${pi.invoiceNo} | Circle: ${pi.circle} | Date: ${pi.invoiceDate}`);
    pi.items.forEach(i => {
      if (i.itemName && i.itemName.match(/MS ANGLE 50X50X6/i)) {
        console.log(`  -> Item: ${i.itemName} | Qty: ${i.invoiceQty || i.quantity || 0}`);
        totalPI += Number(i.invoiceQty || i.quantity || 0);
      }
    });
  });

  console.log(`Total PI Qty (Any Circle): ${totalPI}`);

  await mongoose.disconnect();
}

huntPIAnywhere();
