const mongoose = require('mongoose');
const MONGODB_URI = "mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0";

async function checkCircleExact() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  const entries = await db.collection('storeinwardentries').find({
    itemName: { $regex: /MS ANGLE 50X50X6.*950/i },
    circle: { $regex: /nahan/i }
  }).toArray();
  
  let circleMap = {};
  entries.forEach(e => {
    const qty = Number(e.invoiceQty || 0);
    const circle = e.circle;
    circleMap[circle] = (circleMap[circle] || 0) + qty;
  });

  console.log("950MM Circle breakdown:");
  console.log(circleMap);

  const entries2800 = await db.collection('storeinwardentries').find({
    itemName: { $regex: /MS ANGLE 50X50X6.*2800/i },
    circle: { $regex: /nahan/i }
  }).toArray();
  
  let circleMap2800 = {};
  entries2800.forEach(e => {
    const qty = Number(e.invoiceQty || 0);
    const circle = e.circle;
    circleMap2800[circle] = (circleMap2800[circle] || 0) + qty;
  });

  console.log("2800MM Circle breakdown:");
  console.log(circleMap2800);

  await mongoose.disconnect();
}

checkCircleExact();
