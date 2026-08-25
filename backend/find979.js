const mongoose = require('mongoose');
const MONGODB_URI = "mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0";

async function find979() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  const entries = await db.collection('storeinwardentries').find({
    circle: { $regex: /nahan/i }
  }).toArray();
  
  let map = {};
  entries.forEach(e => {
    const qty = Number(e.invoiceQty || 0);
    const name = e.itemName ? e.itemName.trim() : 'Unknown';
    map[name] = (map[name] || 0) + qty;
  });

  for (const [name, qty] of Object.entries(map)) {
    if (qty === 979 || qty === 4693) {
      console.log(`Found exact match: ${name} = ${qty}`);
    }
  }
  
  // also check if any combination with 3714 equals 4693
  for (const [name, qty] of Object.entries(map)) {
    if (name.includes('ANGLE') && qty > 0) {
      console.log(`Angle Item: ${name} = ${qty}`);
    }
  }

  await mongoose.disconnect();
}

find979();
