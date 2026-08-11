require('dotenv').config();
const mongoose = require('mongoose');

async function clean() {
  try {
    const uri = process.env.MONGODB_URI || "mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0";
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    
    console.log("Deleting empty items...");
    // Delete where SKU is empty, AND Name is empty, AND Temp Code is empty
    const result = await db.collection('items').deleteMany({
      $and: [
        { $or: [{ "dynamicData.sku": "" }, { "dynamicData.sku": { $exists: false } }] },
        { $or: [{ "dynamicData.name": "" }, { "dynamicData.name": { $exists: false } }] },
        { $or: [{ "dynamicData.tempCode": "" }, { "dynamicData.tempCode": { $exists: false } }] }
      ]
    });
    
    console.log(`Deleted ${result.deletedCount} empty items.`);
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

clean();
