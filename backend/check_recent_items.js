require('dotenv').config();
const mongoose = require('mongoose');

async function checkMetadata() {
  try {
    const uri = process.env.MONGODB_URI || "mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0";
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    
    // Find items that have some non-empty sku or name
    const items = await db.collection('items').find({ 
      "dynamicData.sku": { $exists: true, $ne: "" } 
    }).sort({createdAt: -1}).limit(2).toArray();
    
    console.log("Items with SKU:");
    console.log(JSON.stringify(items, null, 2));

    const totalEmpty = await db.collection('items').countDocuments({ "dynamicData.sku": "" });
    console.log("Total empty sku:", totalEmpty);
    
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkMetadata();
