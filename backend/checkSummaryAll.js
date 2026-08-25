const mongoose = require('mongoose');
const MONGODB_URI = "mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0";

async function findAllSummaries() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  const item = await db.collection('items').findOne({ 
    "dynamicData.name": new RegExp(`^\\s*MS ANGLE 50X50X6, L: 2800 MM\\s*$`, 'i') 
  });

  if (item) {
    const summaries = await db.collection('itemsummaries').find({
      itemId: item._id,
      circle: new RegExp(`^\\s*Nahan\\s*$`, 'i')
    }).toArray();
    console.log(`Found ${summaries.length} summaries for Nahan:`);
    summaries.forEach(s => {
      console.log(`- Package: '${s.package}' | invQty: ${s.invQty} | loaQty: ${s.loaQty} | poQty: ${s.poQty || s.bomQty}`);
    });
  }

  await mongoose.disconnect();
}

findAllSummaries();
