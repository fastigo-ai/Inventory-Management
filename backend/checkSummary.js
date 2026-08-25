const mongoose = require('mongoose');
const MONGODB_URI = "mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0";

async function findSummary() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  const item = await db.collection('items').findOne({ 
    "dynamicData.name": new RegExp(`^\\s*MS ANGLE 50X50X6, L: 2800 MM\\s*$`, 'i') 
  });

  if (item) {
    const summary = await db.collection('itemsummaries').findOne({
      itemId: item._id,
      circle: new RegExp(`^\\s*Nahan\\s*$`, 'i')
    });
    console.log("Item Summary Record:", summary);
    
    console.log("Item Dynamic Data Stock Locations:", item.dynamicData.stockLocations);
  }

  await mongoose.disconnect();
}

findSummary();
