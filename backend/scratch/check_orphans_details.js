const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  const db = mongoose.connection.db;
  
  const invs = await db.collection('storeinwardentries').find({ invoiceNumber: { $in: ['277/2026-27', '243/2026-27', '269/2026-27', '242/2026-27', 'LWI/25-26/492', 'LWI/26-27/046', 'LWI/26-27/046', '206/2026-27', '206/2026-27'] } }).toArray();
  console.log(JSON.stringify(invs.map(i => ({ subcircle: i.subcircle, circle: i.circle, pkg: i.package, piId: i.purchaseInvoiceId })), null, 2));
  process.exit(0);
}

run().catch(console.error);
