const mongoose = require('mongoose');
const MONGODB_URI = "mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0";

async function hunt950() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  const itemName = "MS ANGLE 50X50X6, L: 950 MM";

  const allInwards = await db.collection('storeinwardentries').find({
    itemName: new RegExp(`^\\s*${itemName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i')
  }).toArray();

  let invoiceQty = 0, totalQty = 0, receivedQty = 0, acceptedQty = 0;
  
  allInwards.forEach(entry => {
    if (entry.circle && entry.circle.match(/nahan/i)) {
      invoiceQty += Number(entry.invoiceQty || 0);
      totalQty += Number(entry.totalQty || 0);
      receivedQty += Number(entry.receivedQty || 0);
      acceptedQty += Number(entry.acceptedQty || 0);
    }
  });

  console.log(`L: 950 MM (Nahan)`);
  console.log(`- invoiceQty: ${invoiceQty}`);
  console.log(`- totalQty: ${totalQty}`);
  console.log(`- receivedQty: ${receivedQty}`);
  console.log(`- acceptedQty: ${acceptedQty}`);

  await mongoose.disconnect();
}

hunt950();
