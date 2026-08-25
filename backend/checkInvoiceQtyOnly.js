const mongoose = require('mongoose');
const MONGODB_URI = "mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0";

async function checkInvoiceQtyOnly() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  const itemName = "MS ANGLE 50X50X6, L: 2800 MM";
  const item = await db.collection('items').findOne({ 
    "dynamicData.name": new RegExp(`^\\s*${itemName}\\s*$`, 'i') 
  });
  
  if (!item) {
    console.log("Item not found");
    return;
  }

  const allInwards = await db.collection('storeinwardentries').find({
    $or: [
      { itemName: new RegExp(`^\\s*${itemName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i') },
      { itemId: item._id }
    ],
    circle: { $regex: /nahan/i }
  }).toArray();

  let sumInvoiceQty = 0;
  let sumReceivedQty = 0;
  let sumAcceptedQty = 0;
  
  allInwards.forEach(entry => {
    sumInvoiceQty += Number(entry.invoiceQty || 0);
    sumReceivedQty += Number(entry.receivedQty || 0);
    sumAcceptedQty += Number(entry.acceptedQty || 0);
  });

  console.log(`Total Invoice Qty: ${sumInvoiceQty}`);
  console.log(`Total Received Qty: ${sumReceivedQty}`);
  console.log(`Total Accepted Qty: ${sumAcceptedQty}`);

  await mongoose.disconnect();
}

checkInvoiceQtyOnly();
