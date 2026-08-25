const mongoose = require('mongoose');
const MONGODB_URI = "mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0";

async function checkImportedInvoices() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  const pis = await db.collection('purchaseinvoices').find({
    circle: { $regex: /nahan/i }
  }).toArray();
  
  let angleMap = {};
  
  pis.forEach(pi => {
    pi.items.forEach(i => {
      const name = i.itemName ? i.itemName.trim() : 'Unknown';
      if (name.toUpperCase().includes('ANGLE')) {
        const qty = Number(i.invoiceQty || i.quantity || 0);
        angleMap[name] = (angleMap[name] || 0) + qty;
      }
    });
  });

  console.log("PI Quantities for Nahan Angle Items:");
  console.log(angleMap);

  // Let's also check storeinwardentries to see what failed to map or had an error
  // If the user says they imported 4695, maybe some entries are DRAFT or VOIDED?
  const inwards = await db.collection('storeinwardentries').find({
    circle: { $regex: /nahan/i },
    itemName: { $regex: /MS ANGLE 50X50X6, L: 2800 MM/i }
  }).toArray();
  
  let mapByStatus = {};
  inwards.forEach(e => {
    const qty = Number(e.invoiceQty || 0);
    mapByStatus[e.status] = (mapByStatus[e.status] || 0) + qty;
  });
  
  console.log("\nInward Entries 2800MM by Status (InvoiceQty):", mapByStatus);
  
  let mapByStatusTotalQty = {};
  inwards.forEach(e => {
    const qty = Number(e.totalQty || 0);
    mapByStatusTotalQty[e.status] = (mapByStatusTotalQty[e.status] || 0) + qty;
  });
  
  console.log("Inward Entries 2800MM by Status (TotalQty):", mapByStatusTotalQty);

  await mongoose.disconnect();
}

checkImportedInvoices();
