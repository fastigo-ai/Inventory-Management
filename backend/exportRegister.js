const mongoose = require('mongoose');
const MONGODB_URI = "mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0";

async function exportRegister() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  const itemName = "MS ANGLE 50X50X6, L: 2800 MM";
  
  const entries = await db.collection('storeinwardentries').find({
    circle: { $regex: /nahan/i }
  }).toArray();
  
  let sumInvQty2800 = 0;
  let sumTotalQty2800 = 0;
  let sumAccQty2800 = 0;
  let sumInvQty950 = 0;
  let matches2800 = 0;
  let matches950 = 0;

  entries.forEach(entry => {
    if (entry.itemName) {
      if (entry.itemName.match(/MS ANGLE 50X50X6, L: 2800 MM/i)) {
        sumInvQty2800 += Number(entry.invoiceQty || 0);
        sumTotalQty2800 += Number(entry.totalQty || 0);
        sumAccQty2800 += Number(entry.acceptedQty || 0);
        matches2800++;
      }
      if (entry.itemName.match(/MS ANGLE 50X50X6, L: 950 MM/i)) {
        sumInvQty950 += Number(entry.invoiceQty || 0);
        matches950++;
      }
    }
  });

  console.log(`For 2800 MM: Matches: ${matches2800}, sumInvoiceQty: ${sumInvQty2800}, sumTotalQty: ${sumTotalQty2800}`);
  console.log(`For 950 MM: Matches: ${matches950}, sumInvoiceQty: ${sumInvQty950}`);

  await mongoose.disconnect();
}

exportRegister();
