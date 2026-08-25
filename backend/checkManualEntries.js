const mongoose = require('mongoose');
const MONGODB_URI = "mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0";

async function checkManualEntries() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  const inwards = await db.collection('storeinwardentries').find({
    circle: { $regex: /nahan/i },
    itemName: { $regex: /MS ANGLE 50X50X6, L: 2800 MM/i }
  }).toArray();
  
  let missingPiCount = 0;
  let hasPiCount = 0;

  inwards.forEach(e => {
    if (!e.inwardId || !e.inwardId.startsWith('INW-AUTO')) {
      if (e.purchaseInvoiceId) {
        hasPiCount++;
      } else {
        missingPiCount++;
      }
    }
  });

  console.log(`Manual Entries with purchaseInvoiceId: ${hasPiCount}`);
  console.log(`Manual Entries missing purchaseInvoiceId: ${missingPiCount}`);
  
  const sample = inwards.find(e => (!e.inwardId || !e.inwardId.startsWith('INW-AUTO')) && e.purchaseInvoiceId);
  if (sample) {
    const pi = await db.collection('purchaseinvoices').findOne({ _id: sample.purchaseInvoiceId });
    if (!pi) {
      console.log(`PI ${sample.purchaseInvoiceId} referenced but NOT FOUND in purchaseinvoices collection!`);
    } else {
      console.log(`PI Found: circle is ${pi.circle}`);
    }
  }

  await mongoose.disconnect();
}

checkManualEntries();
