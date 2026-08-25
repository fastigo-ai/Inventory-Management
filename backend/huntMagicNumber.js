const mongoose = require('mongoose');
const MONGODB_URI = "mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0";

async function huntMagicNumber() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  const inwards = await db.collection('storeinwardentries').find({
    itemName: { $regex: /MS ANGLE 50X50X6/i }
  }).toArray();
  
  let totalNahan2800 = 0;
  let totalNahan950 = 0;
  let totalAll2800 = 0;
  let totalAll950 = 0;

  inwards.forEach(e => {
    const qty = Number(e.invoiceQty || 0);
    const isNahan = e.circle && e.circle.match(/nahan/i);
    const is2800 = e.itemName && e.itemName.match(/2800/i);
    const is950 = e.itemName && e.itemName.match(/950/i);
    
    if (is2800) totalAll2800 += qty;
    if (is950) totalAll950 += qty;
    
    if (isNahan) {
      if (is2800) totalNahan2800 += qty;
      if (is950) totalNahan950 += qty;
    }
  });

  console.log(`2800 Nahan: ${totalNahan2800}`);
  console.log(`950 Nahan: ${totalNahan950}`);
  console.log(`2800 All: ${totalAll2800}`);
  console.log(`950 All: ${totalAll950}`);
  
  // Let's check Purchase Invoices again, maybe the name is slightly different
  const pis = await db.collection('purchaseinvoices').find({
    circle: { $regex: /nahan/i }
  }).toArray();
  
  let totalPiQty2800 = 0;
  pis.forEach(pi => {
    pi.items.forEach(i => {
      if (i.itemName && i.itemName.match(/ANGLE 50X50X6/i)) {
        if (i.itemName.match(/2800/i)) {
          totalPiQty2800 += Number(i.invoiceQty || i.quantity || 0);
        }
      }
    });
  });
  console.log(`Purchase Invoices 2800 Nahan: ${totalPiQty2800}`);

  await mongoose.disconnect();
}

huntMagicNumber();
