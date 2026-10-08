const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  const db = mongoose.connection.db;
  
  const res = await db.collection('storeinwardentries').updateMany(
    { invoiceNumber: 'LWI/26-27/039', status: 'Approved' },
    { $set: { status: 'Pending Receipt' } }
  );
  console.log('Reversed approvals:', res);
  
  process.exit(0);
}

run().catch(console.error);
