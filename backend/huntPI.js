const mongoose = require('mongoose');
const MONGODB_URI = "mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0";

async function huntPI() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  const pis = await db.collection('purchaseinvoices').find({
    circle: { $regex: /nahan/i },
    "items.itemName": { $regex: /MS ANGLE 50X50X6/i }
  }).toArray();
  
  let piQty = 0;
  pis.forEach(pi => {
    pi.items.forEach(i => {
      if (i.itemName && i.itemName.match(/MS ANGLE 50X50X6/i)) {
        console.log(`PI Item: ${i.itemName} | Qty: ${i.invoiceQty || i.quantity || 0}`);
        piQty += Number(i.invoiceQty || i.quantity || 0);
      }
    });
  });
  console.log(`Total PI Qty (Nahan): ${piQty}`);

  await mongoose.disconnect();
}

huntPI();
