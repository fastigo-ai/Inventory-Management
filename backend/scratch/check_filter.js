const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  const db = mongoose.connection.db;
  
  const filter = {};
  filter.purchaseInvoiceId = new mongoose.Types.ObjectId("6ac4a87da14f600de038a3c0");
  
  const assignedPackage = "Package 1 (S/N)";
  const normalizedPkg = assignedPackage.replace(/\s+/g, '');
  const regexStr = normalizedPkg.split('').map(char => char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s*');
  filter.package = { $regex: new RegExp(`^\\s*${regexStr}\\s*$`, 'i') };
  
  filter.circle = { $in: ["SOLAN"] };
  filter.subcircle = { $regex: new RegExp(`^\\s*Nalagarh\\s*$`, 'i') };
  
  console.log("Filter:", filter);
  
  const entries = await db.collection('storeinwardentries').find(filter).toArray();
  console.log("Count:", entries.length);
  
  process.exit(0);
}

run().catch(console.error);
