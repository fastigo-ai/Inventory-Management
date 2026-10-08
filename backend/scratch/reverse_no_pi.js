const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  const db = mongoose.connection.db;
  
  const res = await db.collection('storeinwardentries').updateMany(
    { status: 'Approved', purchaseInvoiceId: { $exists: false } },
    { $set: { status: 'Pending Receipt' } }
  );
  
  const res2 = await db.collection('storeinwardentries').updateMany(
    { status: 'Approved', purchaseInvoiceId: null },
    { $set: { status: 'Pending Receipt' } }
  );

  console.log('Reversed items without PI (exists false):', res);
  console.log('Reversed items without PI (null):', res2);
  
  process.exit(0);
}

run().catch(console.error);
