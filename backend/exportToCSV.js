const mongoose = require('mongoose');
const fs = require('fs');
const MONGODB_URI = "mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0";

async function exportToCSV() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  const entries = await db.collection('storeinwardentries').find({
    circle: { $regex: /nahan/i },
    itemName: { $regex: /MS ANGLE 50X50X6, L: 2800 MM/i }
  }).toArray();
  
  let csvContent = "Inward ID,Invoice No,Status,Package,Invoice Qty,Received Qty\n";
  let totalInvQty = 0;
  
  entries.forEach(e => {
    totalInvQty += Number(e.invoiceQty || 0);
    csvContent += `${e.inwardId || e._id},${e.invoiceNumber || ''},${e.status},${e.package || ''},${e.invoiceQty || 0},${e.receivedQty || 0}\n`;
  });
  
  csvContent += `,,,TOTAL,${totalInvQty},\n`;

  fs.writeFileSync('/Users/Apple/.gemini/antigravity-ide/brain/94d80cfc-9012-443e-bb44-fe2326b2ac36/2800MM_Nahan_Inwards.csv', csvContent);
  console.log(`Exported ${entries.length} entries. Total Invoice Qty: ${totalInvQty}`);

  await mongoose.disconnect();
}

exportToCSV();
