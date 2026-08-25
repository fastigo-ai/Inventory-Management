const mongoose = require('mongoose');
const MONGODB_URI = "mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0";

async function checkItemSummaries() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  const summaries = await db.collection('itemsummaries').find({
    circle: { $regex: /nahan/i },
    tempCode: "101"
  }).toArray();
  
  let totalInvQty = 0;
  let totalLoaQty = 0;
  let totalBomQty = 0;
  let totalDiQty = 0;
  
  summaries.forEach(s => {
    totalInvQty += Number(s.invQty || 0);
    totalLoaQty += Number(s.loaQty || 0);
    totalBomQty += Number(s.bomQty || 0);
    totalDiQty += Number(s.diQty || 0);
  });
  
  console.log("=== ITEM SUMMARIES for Temp Code 101 in Nahan ===");
  console.log(`invQty: ${totalInvQty}`);
  console.log(`loaQty: ${totalLoaQty}`);
  console.log(`bomQty: ${totalBomQty}`);
  console.log(`diQty: ${totalDiQty}`);
  
  // also sum 950 MM just in case
  const summaries103 = await db.collection('itemsummaries').find({
    circle: { $regex: /nahan/i },
    tempCode: "103"
  }).toArray();
  
  let totalInvQty103 = 0;
  let totalLoaQty103 = 0;
  
  summaries103.forEach(s => {
    totalInvQty103 += Number(s.invQty || 0);
    totalLoaQty103 += Number(s.loaQty || 0);
  });
  
  console.log("\n=== ITEM SUMMARIES for Temp Code 103 in Nahan ===");
  console.log(`invQty: ${totalInvQty103}`);
  console.log(`loaQty: ${totalLoaQty103}`);

  await mongoose.disconnect();
}

checkItemSummaries();
