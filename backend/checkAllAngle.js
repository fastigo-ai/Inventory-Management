const mongoose = require('mongoose');
const MONGODB_URI = "mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0";

async function checkAllAngle() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  const inwards = await db.collection('storeinwardentries').find({
    circle: { $regex: /nahan/i },
    itemName: { $regex: /MS ANGLE 50X50X6/i }
  }).toArray();

  let totalQty = 0;
  let breakdown = {};

  inwards.forEach(entry => {
    const qty = Number(entry.receivedQty || entry.acceptedQty || entry.invoiceQty || entry.totalQty || 0);
    totalQty += qty;
    
    // Normalize name
    const name = entry.itemName.trim();
    breakdown[name] = (breakdown[name] || 0) + qty;
  });

  console.log(`Total Inward Qty for ALL MS ANGLE 50X50X6 in Nahan: ${totalQty}`);
  console.log(breakdown);

  await mongoose.disconnect();
}

checkAllAngle();
