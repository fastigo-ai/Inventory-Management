const mongoose = require('mongoose');
const MONGODB_URI = "mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0";

async function huntLoose() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  const inwards = await db.collection('storeinwardentries').find({
    circle: { $regex: /nahan/i },
    itemName: { $regex: /MS ANGLE 50X50X6.*2800/i }
  }).toArray();

  let invoiceQty = 0;
  inwards.forEach(entry => {
    invoiceQty += Number(entry.invoiceQty || 0);
  });
  console.log(`Total Invoice Qty (Loose Match 2800): ${invoiceQty}`);

  // What about missing the 2800? Just 50x50x6?
  const allAngle = await db.collection('storeinwardentries').find({
    circle: { $regex: /nahan/i },
    itemName: { $regex: /MS ANGLE 50X50X6/i }
  }).toArray();
  
  let mapQty = {};
  allAngle.forEach(entry => {
    const name = entry.itemName.trim();
    mapQty[name] = (mapQty[name] || 0) + Number(entry.invoiceQty || 0);
  });
  console.log("All Angle Breakdown by InvoiceQty:");
  console.log(mapQty);

  await mongoose.disconnect();
}

huntLoose();
