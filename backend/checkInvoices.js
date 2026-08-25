const mongoose = require('mongoose');
const MONGODB_URI = "mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0";

async function checkInvoicesAndInwards() {
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

  // 1. Check Store Inward Entries across ALL statuses
  const allInwards = await db.collection('storeinwardentries').find({
    $or: [
      { itemName: new RegExp(`^\\s*${itemName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i') },
      { itemId: item._id }
    ],
    circle: { $regex: /nahan/i }
  }).toArray();

  let totalInward = 0;
  const statusMap = {};
  
  allInwards.forEach(entry => {
    const qty = Number(entry.receivedQty || entry.acceptedQty || entry.invoiceQty || entry.totalQty || 0);
    totalInward += qty;
    statusMap[entry.status] = (statusMap[entry.status] || 0) + qty;
  });

  console.log("=== STORE INWARD ENTRIES (All Statuses) ===");
  console.log(`Total Qty: ${totalInward}`);
  console.log("Breakdown by status:", statusMap);

  // 2. Check Purchase Invoices
  // Purchase Invoices have items in an 'items' array
  const invoices = await db.collection('purchaseinvoices').find({
    circle: { $regex: /nahan/i },
    "items.itemId": item._id
  }).toArray();

  let totalInvoice = 0;
  let piStatusMap = {};

  invoices.forEach(inv => {
    // find the specific item
    inv.items.forEach(i => {
      if (i.itemId.toString() === item._id.toString()) {
        const qty = Number(i.invoiceQty || i.quantity || 0);
        totalInvoice += qty;
        piStatusMap[inv.status] = (piStatusMap[inv.status] || 0) + qty;
      }
    });
  });

  console.log("\n=== PURCHASE INVOICES ===");
  console.log(`Total Qty (Invoice): ${totalInvoice}`);
  console.log("Breakdown by status:", piStatusMap);

  await mongoose.disconnect();
}

checkInvoicesAndInwards();
