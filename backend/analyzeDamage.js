const mongoose = require('mongoose');
const MONGODB_URI = "mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0";

async function analyzeDamage() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  const inwards = await db.collection('storeinwardentries').find({
    inwardId: { $regex: /^INW-AUTO-/ }
  }).toArray();
  
  console.log(`Total INW-AUTO- entries found: ${inwards.length}`);
  
  const affectedCircles = new Set();
  const affectedInvoices = new Set();
  let totalMessedUpQty = 0;

  inwards.forEach(e => {
    affectedCircles.add(e.circle);
    affectedInvoices.add(e.invoiceNumber);
    totalMessedUpQty += Number(e.totalQty || 0);
  });

  console.log(`Affected Circles: ${Array.from(affectedCircles).join(', ')}`);
  console.log(`Total Invoices Affected: ${affectedInvoices.size}`);
  console.log(`Total Qty within INW-AUTO- entries: ${totalMessedUpQty}`);

  // Also check if they overlap with Item Summaries?
  // Because if we wipe these, we need to recompute item summaries!
  const summaries = await db.collection('itemsummaries').find({}).toArray();
  console.log(`Total Item Summaries in DB: ${summaries.length}`);

  await mongoose.disconnect();
}

analyzeDamage();
