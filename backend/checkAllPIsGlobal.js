const mongoose = require('mongoose');
const MONGODB_URI = "mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0";

async function checkAllPIsGlobal() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  const pis = await db.collection('purchaseinvoices').find({}).toArray();
  
  let map = {};
  
  pis.forEach(pi => {
    if (!pi.lineItems) return;
    pi.lineItems.forEach(i => {
      // Check if the LINE ITEM circle is Nahan
      if (i.circle && i.circle.match(/nahan/i)) {
        const name = i.itemName || 'Unknown';
        if (name.toUpperCase().includes('ANGLE 50X50X6, L: 2800 MM')) {
           const qty = Number(i.invoiceQty || i.quantity || 0);
           map[name] = (map[name] || 0) + qty;
        }
      }
    });
  });

  console.log("PI Line Items in Nahan (Global Search):");
  for (const [name, qty] of Object.entries(map)) {
    console.log(`${name}: ${qty}`);
  }

  await mongoose.disconnect();
}

checkAllPIsGlobal();
