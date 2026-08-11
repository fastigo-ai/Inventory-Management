require('dotenv').config();
const mongoose = require('mongoose');

async function checkMetadata() {
  try {
    const uri = process.env.MONGODB_URI || "mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0";
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    
    const meta = await db.collection('metadatas').findOne({ entityName: 'Item' });
    console.log(JSON.stringify(meta.fields.map(f => ({ label: f.label, name: f.name })), null, 2));
    
    // Also check one recently imported item
    const recentItem = await db.collection('items').find().sort({createdAt: -1}).limit(1).toArray();
    console.log("Recent item dynamic data:");
    console.log(JSON.stringify(recentItem[0]?.dynamicData, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkMetadata();
