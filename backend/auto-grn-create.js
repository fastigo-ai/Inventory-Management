const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');
dotenv.config({ path: './.env' });

const PROGRESS_FILE = '/tmp/grn-progress.json';

async function run() {
  await mongoose.connect(process.env.MONGO_URI);

  const circles = ['Nahan', 'Solan', 'Rampur'];
  const progress = {
    Nahan:  { done: 0, total: 0, created: 0, skipped: 0, status: 'pending' },
    Solan:  { done: 0, total: 0, created: 0, skipped: 0, status: 'pending' },
    Rampur: { done: 0, total: 0, created: 0, skipped: 0, status: 'pending' },
  };
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress));

  for (const circle of circles) {
    const regex = new RegExp(`^${circle}$`, 'i');
    progress[circle].status = 'running';

    const pis = await mongoose.connection.collection('purchaseinvoices')
      .find({ 'lineItems.circle': regex }).toArray();

    progress[circle].total = pis.length;
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress));
    console.log(`[${circle}] Starting: ${pis.length} PIs to process...`);

    for (const pi of pis) {
      const circleItems = pi.lineItems.filter(li => li.circle && regex.test(li.circle));

      for (const item of circleItems) {
        const qty = Number(item.quantity) || 0;
        if (!item.tempCode || qty <= 0) continue;

        // Skip if inward already exists for this PI + tempCode + circle
        const exists = await mongoose.connection.collection('storeinwardentries').countDocuments({
          purchaseInvoiceId: pi._id,
          tempCode: item.tempCode,
          circle: regex,
          status: { $in: ['APPROVED', 'SUBMITTED'] }
        });

        if (exists > 0) { progress[circle].skipped++; continue; }

        await mongoose.connection.collection('storeinwardentries').insertOne({
          inwardId: `INW-AUTO-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
          purchaseInvoiceId: pi._id,
          circle,
          tempCode: item.tempCode,
          itemName: item.itemName,
          hsnCode: item.hsnCode || '',
          invoiceQty: qty,
          receivedQty: qty,
          rejectedQty: 0,
          packingList: [{ description: item.itemName, quantity: qty }],
          status: 'APPROVED',
          createdAt: new Date(),
          updatedAt: new Date()
        });
        progress[circle].created++;
      }

      progress[circle].done++;
      fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress));
    }

    progress[circle].status = 'done';
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress));
    console.log(`[${circle}] COMPLETE → Created: ${progress[circle].created}, Skipped: ${progress[circle].skipped}`);
  }

  console.log('\n✅ ALL GRN ENTRIES CREATED SUCCESSFULLY');
  process.exit(0);
}
run().catch(console.error);
