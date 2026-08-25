const mongoose = require('mongoose');
const MONGODB_URI = "mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0";

async function find4000() {
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

  // Check POs
  const pos = await db.collection('purchaseorders').find({
    circle: { $regex: /nahan/i },
    "items.itemId": item._id
  }).toArray();
  
  let poQty = 0;
  pos.forEach(po => {
    po.items.forEach(i => {
      if (i.itemId.toString() === item._id.toString()) {
        poQty += Number(i.quantity || 0);
      }
    });
  });
  console.log(`Total PO Qty: ${poQty}`);

  // Check DIs
  const dis = await db.collection('dispatchinstructions').find({
    circle: { $regex: /nahan/i },
    "items.itemId": item._id
  }).toArray();
  
  let diQty = 0;
  dis.forEach(di => {
    di.items.forEach(i => {
      if (i.itemId.toString() === item._id.toString()) {
        diQty += Number(i.quantity || i.diQty || 0);
      }
    });
  });
  console.log(`Total DI Qty: ${diQty}`);
  
  // Check PRs
  const prs = await db.collection('purchaserequisitions').find({
    circle: { $regex: /nahan/i },
    "items.itemId": item._id
  }).toArray();
  
  let prQty = 0;
  prs.forEach(pr => {
    pr.items.forEach(i => {
      if (i.itemId.toString() === item._id.toString()) {
        prQty += Number(i.quantity || 0);
      }
    });
  });
  console.log(`Total PR Qty: ${prQty}`);
  
  // Also sum acceptedQty, missingQty, rejectedQty from inward entries
  const inwards = await db.collection('storeinwardentries').find({
    itemId: item._id,
    circle: { $regex: /nahan/i }
  }).toArray();
  
  let accQty = 0, rejQty = 0, missQty = 0, totalQtySum = 0;
  inwards.forEach(entry => {
    accQty += Number(entry.acceptedQty || 0);
    rejQty += Number(entry.rejectedQty || 0);
    missQty += Number(entry.missingQty || 0);
    totalQtySum += Number(entry.totalQty || 0);
  });
  console.log(`Inwards - Accepted: ${accQty}, Rejected: ${rejQty}, Missing: ${missQty}, TotalQtyField: ${totalQtySum}`);

  // Let's check PI again, maybe without item ID, just item name?
  const pisByName = await db.collection('purchaseinvoices').find({
    circle: { $regex: /nahan/i },
    "items.itemName": { $regex: /MS ANGLE 50X50X6/i }
  }).toArray();
  
  let piQty = 0;
  pisByName.forEach(pi => {
    pi.items.forEach(i => {
      if (i.itemName && i.itemName.match(/MS ANGLE 50X50X6/i)) {
        piQty += Number(i.invoiceQty || i.quantity || 0);
      }
    });
  });
  console.log(`Total PI Qty (by name): ${piQty}`);

  await mongoose.disconnect();
}

find4000();
