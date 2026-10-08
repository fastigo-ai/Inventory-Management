const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  const db = mongoose.connection.db;
  
  const invs = await db.collection('storeinwardentries').find({ 
    purchaseInvoiceId: { $exists: false } 
  }).toArray();
  
  console.log('Count:', invs.length);
  
  process.exit(0);
}

run().catch(console.error);
