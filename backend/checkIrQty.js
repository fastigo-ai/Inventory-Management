const mongoose = require('mongoose');
const MONGODB_URI = "mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0";

async function checkIrQty() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  const entries = await db.collection('storeinwardentries').find({
    circle: { $regex: /nahan/i },
    itemName: { $regex: /MS ANGLE 50X50X6, L: 2800 MM/i }
  }).toArray();
  
  let totalIrQty = 0;
  let totalDiQty = 0;
  let totalPoQty = 0;
  let totalAcceptedQty = 0;
  let totalReceivedQty = 0;
  
  entries.forEach(e => {
    totalIrQty += Number(e.irQty || e.irQuantity || 0);
    totalDiQty += Number(e.diQty || e.diQuantity || 0);
    totalPoQty += Number(e.poQty || e.poQuantity || 0);
    totalAcceptedQty += Number(e.acceptedQty || 0);
    totalReceivedQty += Number(e.receivedQty || 0);
  });
  
  console.log("From Store Inward Entries:");
  console.log(`IR Qty: ${totalIrQty}`);
  console.log(`DI Qty: ${totalDiQty}`);
  console.log(`PO Qty: ${totalPoQty}`);
  console.log(`Accepted Qty: ${totalAcceptedQty}`);
  console.log(`Received Qty: ${totalReceivedQty}`);

  // Also check item summaries
  const summaries = await db.collection('itemsummaries').find({
    circle: { $regex: /nahan/i },
    tempCode: "101"
  }).toArray();
  
  console.log("\nFrom Item Summaries:");
  summaries.forEach(s => {
    console.log(s);
  });

  await mongoose.disconnect();
}

checkIrQty();
