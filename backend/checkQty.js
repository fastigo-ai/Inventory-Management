const mongoose = require('mongoose');
const MONGODB_URI = "mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0";

async function findActualQty() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  const itemName = "MS ANGLE 50X50X6, L: 2800 MM";
  const item = await db.collection('items').findOne({ 
    "dynamicData.name": new RegExp(`^\\s*${itemName}\\s*$`, 'i') 
  });

  const inwards = await db.collection('storeinwardentries').find({
    $or: [
      { itemName: new RegExp(`^\\s*${itemName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i') },
      ...(item ? [{ itemId: item._id }] : [])
    ],
    status: { $in: ['APPROVED', 'VERIFIED'] },
    circle: { $regex: /nahan/i }
  }).toArray();

  let totalReceived = 0;
  
  const packageMap = {};

  inwards.forEach((entry, idx) => {
    const qty = Number(entry.receivedQty || entry.acceptedQty || entry.invoiceQty || entry.totalQty || 0);
    totalReceived += qty;
    
    const pkg = entry.package || 'UNKNOWN';
    if (!packageMap[pkg]) {
      packageMap[pkg] = 0;
    }
    packageMap[pkg] += qty;
  });

  console.log(`\nTotal Actual Qty Received in Nahan Store: ${totalReceived}`);
  console.log('Breakdown by package:');
  Object.keys(packageMap).forEach(pkg => {
    console.log(`  Package: ${pkg} | Qty: ${packageMap[pkg]}`);
  });

  await mongoose.disconnect();
}

findActualQty();
