const mongoose = require('mongoose');
const MONGODB_URI = "mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0";

async function checkQuantitiesDiff() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  const entries = await db.collection('storeinwardentries').find({
    circle: { $regex: /nahan/i },
    itemName: { $regex: /MS ANGLE 50X50X6, L: 2800 MM/i }
  }).toArray();
  
  let zeroReceivedCount = 0;
  let partialReceivedCount = 0;
  let fullReceivedCount = 0;
  
  let sumRejected = 0;
  let sumMissing = 0;
  let sumAccepted = 0;
  
  entries.forEach(e => {
    const invQty = Number(e.invoiceQty || 0);
    const recQty = Number(e.receivedQty || 0);
    
    sumRejected += Number(e.rejectedQty || 0);
    sumMissing += Number(e.missingQty || e.shortQty || 0);
    sumAccepted += Number(e.acceptedQty || 0);
    
    if (recQty === 0 && invQty > 0) {
      zeroReceivedCount++;
    } else if (recQty > 0 && recQty < invQty) {
      partialReceivedCount++;
    } else if (recQty === invQty && invQty > 0) {
      fullReceivedCount++;
    }
  });

  console.log(`Total Entries: ${entries.length}`);
  console.log(`Entries with 0 receivedQty but >0 invoiceQty: ${zeroReceivedCount}`);
  console.log(`Entries with partial receivedQty: ${partialReceivedCount}`);
  console.log(`Entries with full receivedQty: ${fullReceivedCount}`);
  console.log(`\nOther Totals:`);
  console.log(`Accepted Qty: ${sumAccepted}`);
  console.log(`Rejected Qty: ${sumRejected}`);
  console.log(`Missing/Short Qty: ${sumMissing}`);

  // Let's print out the first 3 entries where receivedQty is 0
  const zeroEntries = entries.filter(e => Number(e.receivedQty || 0) === 0 && Number(e.invoiceQty || 0) > 0).slice(0, 3);
  console.log("\nSample Entries with 0 receivedQty:");
  zeroEntries.forEach(e => {
    console.log(`- InwardId: ${e.inwardId || e._id}, InvQty: ${e.invoiceQty}, TotalQty: ${e.totalQty}, ReceivedQty: ${e.receivedQty}`);
  });

  await mongoose.disconnect();
}

checkQuantitiesDiff();
