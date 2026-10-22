import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || '');
  const db = mongoose.connection.db!;

  // 1. Purchase Invoices in Solan for STP 9 MTR (tempCode 1)
  const pis = await db.collection('purchaseinvoices').find({
    status: { $ne: 'Cancelled' },
    $or: [{ circle: /solan/i }, { 'lineItems.circle': /solan/i }]
  }).toArray();

  let piStp9Qty = 0;
  for (const pi of pis) {
    for (const li of (pi.lineItems || [])) {
      const isSolan = (li.circle || pi.circle || '').toLowerCase().includes('solan');
      const isStp9 = (li.itemName || '').toLowerCase().includes('stp 9 mtr') || li.tempCode === '1';
      if (isSolan && isStp9) {
        piStp9Qty += Number(li.quantity || li.invoiceQuantity || 0);
      }
    }
  }

  // 2. Store Inward Entries in Solan for STP 9 MTR
  const inwards = await db.collection('storeinwardentries').find({
    status: { $ne: 'Voided' },
    circle: /solan/i,
    $or: [{ itemName: /stp 9 mtr/i }, { tempCode: '1' }]
  }).toArray();

  let inwardStp9Qty = 0;
  for (const inv of inwards) {
    inwardStp9Qty += Number(inv.totalQty || inv.invoiceQty || inv.acceptedQty || 0);
  }

  // 3. Store Inward Entries in Nalagarh specifically for STP 9 MTR
  const nalagarhInwards = await db.collection('storeinwardentries').find({
    status: { $ne: 'Voided' },
    store: /nalagarh/i,
    $or: [{ itemName: /stp 9 mtr/i }, { tempCode: '1' }]
  }).toArray();

  let nalagarhStp9Qty = 0;
  for (const inv of nalagarhInwards) {
    nalagarhStp9Qty += Number(inv.totalQty || inv.invoiceQty || inv.acceptedQty || 0);
  }

  console.log('--- STP 9 MTR (tempCode 1) Comparison ---');
  console.log('Solan Total PurchaseInvoice (PI) Qty:', piStp9Qty);
  console.log('Solan Total StoreInwardEntry Qty:', inwardStp9Qty);
  console.log('Nalagarh Specific StoreInwardEntry Qty:', nalagarhStp9Qty);

  // 4. Also check DI and MHROV for STP 9 MTR in Solan
  const dis = await db.collection('dis').find({
    status: { $ne: 'Cancelled' },
    $or: [{ circle: /solan/i }, { 'lineItems.circle': /solan/i }]
  }).toArray();
  let diStp9Qty = 0;
  for (const di of dis) {
    for (const li of (di.lineItems || [])) {
      const isSolan = (li.circle || di.circle || '').toLowerCase().includes('solan');
      const isStp9 = (li.itemName || '').toLowerCase().includes('stp 9 mtr') || li.tempCode === '1';
      if (isSolan && isStp9) {
        diStp9Qty += Number(li.quantity || 0);
      }
    }
  }
  console.log('Solan Total DI Qty:', diStp9Qty);

  await mongoose.disconnect();
}
run().catch(console.error);
