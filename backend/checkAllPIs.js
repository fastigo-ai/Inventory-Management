const mongoose = require('mongoose');
const MONGODB_URI = "mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0";

async function checkAllPIs() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  const pis = await db.collection('purchaseinvoices').find({
    circle: { $regex: /nahan/i }
  }).toArray();
  
  let map = {};
  
  pis.forEach(pi => {
    if (!pi.lineItems) return;
    pi.lineItems.forEach(i => {
      const name = i.itemName || 'Unknown';
      const qty = Number(i.quantity || i.invoiceQty || 0);
      map[name] = (map[name] || 0) + qty;
    });
  });

  console.log("PI Line Items in Nahan:");
  for (const [name, qty] of Object.entries(map)) {
    console.log(`${name}: ${qty}`);
  }

  await mongoose.disconnect();
}

checkAllPIs();
