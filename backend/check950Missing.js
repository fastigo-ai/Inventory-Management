const mongoose = require('mongoose');
const MONGODB_URI = "mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0";

async function check950Missing() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  const entries = await db.collection('storeinwardentries').find({
    circle: { $regex: /nahan/i },
    itemName: { $regex: /MS ANGLE 50X50X6.*950/i }
  }).toArray();
  
  let validQty = 0;
  let missingQty = 0;
  
  entries.forEach(e => {
    const qty = Number(e.invoiceQty || 0);
    // Mimic getInwardRegister filter
    const hasPI = !!e.purchaseInvoiceId;
    const isValidStatus = ['PENDING_RECEIPT', 'APPROVED', 'VERIFIED', 'INWARDED', 'SUBMITTED'].includes(e.status);
    
    if (hasPI && isValidStatus) {
      validQty += qty;
    } else {
      missingQty += qty;
      console.log(`Excluded Entry - Qty: ${qty}, Status: ${e.status}, hasPI: ${hasPI}`);
    }
  });

  console.log(`\n950MM - Valid Export Qty: ${validQty}`);
  console.log(`950MM - Excluded Qty: ${missingQty}`);

  await mongoose.disconnect();
}

check950Missing();
