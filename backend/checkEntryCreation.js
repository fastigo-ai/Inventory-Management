const mongoose = require('mongoose');
const MONGODB_URI = "mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0";

async function checkEntryCreation() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  const inwards = await db.collection('storeinwardentries').find({
    circle: { $regex: /nahan/i },
    itemName: { $regex: /MS ANGLE 50X50X6, L: 2800 MM/i }
  }).sort({ createdAt: -1 }).limit(10).toArray();
  
  console.log("Recent 10 entries for 2800MM Nahan:");
  inwards.forEach(e => {
    console.log(`- inwardId: ${e.inwardId}, invoiceNo: ${e.invoiceNumber}, createdAt: ${e.createdAt}, invoiceQty: ${e.invoiceQty}, totalQty: ${e.totalQty}`);
  });

  // check if there's any scripts in the brain folder
  const fs = require('fs');
  const path = require('path');
  const brainDir = '/Users/Apple/.gemini/antigravity-ide/brain/94d80cfc-9012-443e-bb44-fe2326b2ac36/scratch';
  if (fs.existsSync(brainDir)) {
    console.log('\nScratch dir contents:');
    console.log(fs.readdirSync(brainDir));
  }

  await mongoose.disconnect();
}

checkEntryCreation();
