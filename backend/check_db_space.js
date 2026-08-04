require('dotenv').config();
const mongoose = require('mongoose');

async function checkSpace() {
  try {
    const uri = process.env.MONGODB_URI || "mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0";
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    
    console.log("Connected to MongoDB. Checking collection sizes...");
    
    const collections = await db.listCollections().toArray();
    const stats = [];
    
    for (const col of collections) {
      const collStats = await db.command({ collStats: col.name });
      stats.push({
        name: col.name,
        sizeMB: (collStats.size / (1024 * 1024)).toFixed(2),
        count: collStats.count
      });
    }
    
    stats.sort((a, b) => parseFloat(b.sizeMB) - parseFloat(a.sizeMB));
    
    console.table(stats);
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkSpace();
