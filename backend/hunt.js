const mongoose = require('mongoose');
const MONGODB_URI = "mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0";

async function huntFor4693() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  const itemName = "MS ANGLE 50X50X6, L: 2800 MM";

  // Check store inwards for ANY circle matching name
  const allInwards = await db.collection('storeinwardentries').find({
    itemName: new RegExp(`^\\s*${itemName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i')
  }).toArray();

  let totalInvoiceQty = 0;
  let nahanInvoiceQty = 0;
  
  allInwards.forEach(entry => {
    const qty = Number(entry.invoiceQty || 0);
    totalInvoiceQty += qty;
    if (entry.circle && entry.circle.match(/nahan/i)) {
      nahanInvoiceQty += qty;
    }
  });

  console.log(`Total Invoice Qty (All Circles): ${totalInvoiceQty}`);
  console.log(`Total Invoice Qty (Nahan): ${nahanInvoiceQty}`);

  // What about totalQty or receivedQty or acceptedQty?
  let nahanTotalQty = 0, nahanReceivedQty = 0;
  allInwards.forEach(entry => {
    if (entry.circle && entry.circle.match(/nahan/i)) {
      nahanTotalQty += Number(entry.totalQty || 0);
      nahanReceivedQty += Number(entry.receivedQty || 0);
    }
  });
  console.log(`Total 'totalQty' (Nahan): ${nahanTotalQty}`);
  console.log(`Total 'receivedQty' (Nahan): ${nahanReceivedQty}`);
  
  // Let's check PI again, just in case
  const pis = await db.collection('purchaseinvoices').find({
    "items.itemName": new RegExp(`^\\s*${itemName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i')
  }).toArray();
  
  let piQty = 0;
  pis.forEach(pi => {
    pi.items.forEach(i => {
      if (i.itemName && i.itemName.match(/MS ANGLE 50X50X6, L: 2800 MM/i)) {
        piQty += Number(i.invoiceQty || i.quantity || 0);
      }
    });
  });
  console.log(`Total PI Qty (All Circles): ${piQty}`);

  await mongoose.disconnect();
}

huntFor4693();
