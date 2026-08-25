const mongoose = require('mongoose');
const MONGODB_URI = "mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0";

async function checkAutoEntries() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  const inwards = await db.collection('storeinwardentries').find({
    circle: { $regex: /nahan/i },
    itemName: { $regex: /MS ANGLE 50X50X6, L: 2800 MM/i }
  }).toArray();
  
  let autoQty = 0;
  let manualQty = 0;
  let autoCount = 0;
  let manualCount = 0;

  inwards.forEach(e => {
    const qty = Number(e.totalQty || 0);
    if (e.inwardId && e.inwardId.startsWith('INW-AUTO')) {
      autoQty += qty;
      autoCount++;
    } else {
      manualQty += qty;
      manualCount++;
    }
  });

  console.log(`Auto Generated Entries (INW-AUTO-): ${autoCount} entries, totalQty: ${autoQty}`);
  console.log(`Manual/Imported Entries: ${manualCount} entries, totalQty: ${manualQty}`);

  await mongoose.disconnect();
}

checkAutoEntries();
