const mongoose = require('mongoose');
const MONGODB_URI = "mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0";

async function findAllInvoicesByName() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  const itemName = "MS ANGLE 50X50X6, L: 2800 MM";

  // Check PI by name
  const pisByName = await db.collection('purchaseinvoices').find({
    circle: { $regex: /nahan/i },
    "items.itemName": { $regex: /MS ANGLE 50X50X6/i }
  }).toArray();
  
  let piQty = 0;
  let piMatches = [];
  pisByName.forEach(pi => {
    pi.items.forEach(i => {
      if (i.itemName && i.itemName.match(/MS ANGLE 50X50X6.*2800/i)) {
        const qty = Number(i.invoiceQty || i.quantity || i.totalQty || i.receivedQty || 0);
        piQty += qty;
        piMatches.push({ invoiceNo: pi.invoiceNo || pi._id, qty, status: pi.status });
      }
    });
  });

  console.log(`Total PI Qty (by name): ${piQty}`);
  console.log(piMatches);

  // Check Inwards by name
  const inwardsByName = await db.collection('storeinwardentries').find({
    circle: { $regex: /nahan/i },
    itemName: { $regex: /MS ANGLE 50X50X6.*2800/i }
  }).toArray();

  let inwQty = 0;
  inwardsByName.forEach(inw => {
    const qty = Number(inw.receivedQty || inw.acceptedQty || inw.invoiceQty || inw.totalQty || 0);
    inwQty += qty;
  });
  console.log(`Total Inward Qty (by name): ${inwQty}`);

  await mongoose.disconnect();
}

findAllInvoicesByName();
