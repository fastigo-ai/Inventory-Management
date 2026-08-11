require('dotenv').config();
const mongoose = require('mongoose');

async function approveNahan() {
  try {
    const uri = process.env.MONGODB_URI || "mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0";
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    
    console.log("Looking for pending Nahan Store Receipts...");
    
    // Find all store inward entries for Nahan
    const filter = {
      status: 'PENDING_RECEIPT',
      circle: { $regex: new RegExp('^nahan$', 'i') }
    };
    
    const entries = await db.collection('storeinwardentries').find(filter).toArray();
    console.log(`Found ${entries.length} pending Nahan receipts.`);
    
    if (entries.length > 0) {
      console.log(`Approving ${entries.length} receipts...`);
      const result = await db.collection('storeinwardentries').updateMany(
        filter,
        { $set: { status: 'APPROVED' } }
      );
      console.log(`Successfully approved ${result.modifiedCount} entries.`);
    } else {
      console.log("No pending Nahan receipts found. They might have a different circle format or are already approved.");
    }
    
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

approveNahan();
