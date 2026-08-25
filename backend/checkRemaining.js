const mongoose = require('mongoose');
const MONGODB_URI = "mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0";

async function checkRemaining() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  const count = await db.collection('storeinwardentries').countDocuments({
    inwardId: { $regex: /^INW-AUTO-/ }
  });
  
  console.log(`Remaining INW-AUTO- entries in DB: ${count}`);

  await mongoose.disconnect();
}

checkRemaining();
