require('dotenv').config();
const mongoose = require('mongoose');

async function massSubmit() {
  try {
    const uri = process.env.MONGODB_URI || "mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0";
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    
    // Update all remaining APPROVED to SUBMITTED
    const submitResult = await db.collection('storeinwardentries').updateMany(
      { status: 'APPROVED' },
      { $set: { status: 'SUBMITTED' } }
    );
    console.log(`Submitted ${submitResult.modifiedCount} previously APPROVED entries.`);
    
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

massSubmit();
