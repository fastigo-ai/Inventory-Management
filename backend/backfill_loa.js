require('dotenv').config();
const mongoose = require('mongoose');

async function backfill() {
  try {
    const uri = process.env.MONGODB_URI || "mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0";
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    
    console.log("Fetching items to backfill...");
    const items = await db.collection('items').find({}).toArray();
    
    let updatedCount = 0;
    const bulkOps = [];
    
    for (const item of items) {
      if (!item.dynamicData) continue;
      
      const solan = Number(item.dynamicData.solanLoaQuantity) || 0;
      const nahan = Number(item.dynamicData.nahanLoaQuantity) || 0;
      const rampur = Number(item.dynamicData.rampurLoaQuantity) || 0;
      const rohru = Number(item.dynamicData.rohruLoaQuantity) || 0;
      
      const pkg1Sum = solan + nahan;
      const pkg2Sum = rampur + rohru;
      
      let newLoa = Number(item.dynamicData.loaQuantity) || 0;
      if (pkg1Sum > 0) newLoa = pkg1Sum;
      else if (pkg2Sum > 0) newLoa = pkg2Sum;
      
      if (newLoa !== item.dynamicData.loaQuantity) {
        bulkOps.push({
          updateOne: {
            filter: { _id: item._id },
            update: { $set: { "dynamicData.loaQuantity": newLoa } }
          }
        });
        updatedCount++;
      }
    }
    
    if (bulkOps.length > 0) {
      // Execute in chunks of 1000 to avoid memory issues
      const chunkSize = 1000;
      for (let i = 0; i < bulkOps.length; i += chunkSize) {
        const chunk = bulkOps.slice(i, i + chunkSize);
        await db.collection('items').bulkWrite(chunk);
      }
    }
    
    console.log(`Successfully backfilled LOA Quantity for ${updatedCount} items.`);
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

backfill();
