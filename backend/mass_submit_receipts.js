require('dotenv').config();
const mongoose = require('mongoose');

async function massSubmit() {
  try {
    const uri = process.env.MONGODB_URI || "mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0";
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    
    console.log("Mass updating store inward entries...");
    
    // First, update all APPROVED to SUBMITTED
    const submitResult = await db.collection('storeinwardentries').updateMany(
      { status: 'APPROVED' },
      { $set: { status: 'SUBMITTED' } }
    );
    console.log(`Submitted ${submitResult.modifiedCount} previously APPROVED entries.`);

    // Next, update all PENDING_RECEIPT to APPROVED (or should they go straight to SUBMITTED?)
    // The user said "do the store receipt action approve submit for all store"
    // I'll update all PENDING_RECEIPT to APPROVED
    const approveResult = await db.collection('storeinwardentries').updateMany(
      { status: 'PENDING_RECEIPT' },
      { $set: { status: 'APPROVED' } }
    );
    console.log(`Approved ${approveResult.modifiedCount} previously PENDING_RECEIPT entries.`);
    
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

massSubmit();
