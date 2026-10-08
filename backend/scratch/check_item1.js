const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  const db = mongoose.connection.db;
  
  const inv = await db.collection('storeinwardentries').findOne({ invoiceNumber: '1', status: 'Pending Receipt' });
  console.log(JSON.stringify(inv, null, 2));
  
  process.exit(0);
}

run().catch(console.error);
