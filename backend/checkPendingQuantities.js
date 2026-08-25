const mongoose = require('mongoose');
const MONGODB_URI = "mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0";

async function checkPendingQuantities() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  const pending = await db.collection('storeinwardentries').find({
    status: 'PENDING_RECEIPT'
  }).toArray();

  let missingQty = 0;
  pending.forEach(p => {
    const qty = p.invoiceQty || p.totalQty;
    if (!qty || qty <= 0) {
      missingQty++;
    }
  });

  console.log(`Pending entries: ${pending.length}. Missing or <= 0 qty: ${missingQty}.`);

  await mongoose.disconnect();
}

checkPendingQuantities();
