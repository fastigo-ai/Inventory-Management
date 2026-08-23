const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const db = mongoose.connection.db;

  const circle = 'Solan';
  const subcircleRegex = /kumarhatti/i;

  const approved = await db.collection('storeinwardentries').find({
    circle: circle,
    subcircle: { $regex: subcircleRegex },
    status: 'APPROVED'
  }).toArray();

  console.log(`Approved receipts for Solan / Kumarhatti: ${approved.length}`);

  if (approved.length > 0) {
    console.log('\n--- Sample of the first 3 Approved Entries ---');
    approved.slice(0, 3).forEach((entry, i) => {
      console.log(`\nEntry ${i + 1}:`);
      console.log(`  _id: ${entry._id}`);
      console.log(`  PI ID: ${entry.purchaseInvoiceId}`);
      console.log(`  Invoice No: ${entry.invoiceNumber}`);
      console.log(`  Temp Code: ${entry.tempCode}`);
      console.log(`  Item Name: ${entry.itemName}`);
      console.log(`  Qty: ${entry.invoiceQty}`);
      console.log(`  CreatedAt: ${entry.createdAt}`);
      console.log(`  UpdatedAt: ${entry.updatedAt}`);
      console.log(`  AuditLogs: ${entry.auditLogs ? entry.auditLogs.length : 0} log(s)`);
      if (entry.auditLogs && entry.auditLogs.length > 0) {
        console.log(`  First Audit Log: ${JSON.stringify(entry.auditLogs[0])}`);
      }
    });

    console.log('\n--- Breakdown by CreatedAt Date ---');
    const byDate = {};
    approved.forEach(e => {
      const date = e.createdAt ? e.createdAt.toISOString().split('T')[0] : 'Unknown';
      byDate[date] = (byDate[date] || 0) + 1;
    });
    console.log(byDate);
  }

  await mongoose.disconnect();
});
