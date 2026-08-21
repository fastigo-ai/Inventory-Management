const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const circle = 'Nahan';
  const regex = new RegExp(`^${circle}$`, 'i');
  const tempCode = '101';

  console.log("=== TempCode 101: MS ANGLE 50X50X6, L: 2800 MM | NAHAN ===\n");

  // --- All PIs containing this item for Nahan ---
  const pis = await mongoose.connection.collection('purchaseinvoices')
    .find({ 'lineItems': { $elemMatch: { tempCode, circle: regex } } }).toArray();

  let totalPiQty = 0;
  console.log(`--- PURCHASE INVOICES (${pis.length} PIs) ---`);
  for (const pi of pis) {
    for (const item of pi.lineItems) {
      if (item.tempCode === tempCode && item.circle && regex.test(item.circle)) {
        console.log(`  PI: ${pi.invoiceNumber} | Date: ${pi.date ? new Date(pi.date).toLocaleDateString('en-IN') : '-'} | Qty: ${item.quantity}`);
        totalPiQty += Number(item.quantity) || 0;
      }
    }
  }
  console.log(`\n  TOTAL PI QTY: ${totalPiQty}`);

  // --- All DIs containing this item for Nahan ---
  const dis = await mongoose.connection.collection('dis')
    .find({ $or: [{ 'lineItems': { $elemMatch: { tempCode, circle: regex } } }, { circle: regex, 'lineItems.tempCode': tempCode }] }).toArray();

  let totalDiQty = 0;
  console.log(`\n--- DISPATCH INSTRUCTIONS (${dis.length} DIs) ---`);
  for (const di of dis) {
    for (const item of di.lineItems) {
      if (item.tempCode === tempCode) {
        const itemCircle = item.circle || di.circle;
        if (itemCircle && regex.test(itemCircle)) {
          console.log(`  DI: ${di.diNumber} | Qty: ${item.quantity}`);
          totalDiQty += Number(item.quantity) || 0;
        }
      }
    }
  }
  console.log(`\n  TOTAL DI QTY: ${totalDiQty}`);
  console.log(`  TOTAL INVOICED (PI + DI): ${totalPiQty + totalDiQty}`);

  // --- All Inward Entries for this item in Nahan ---
  const inwards = await mongoose.connection.collection('storeinwardentries')
    .find({ tempCode, circle: regex }).toArray();

  let totalInwardQty = 0;
  console.log(`\n--- INWARD / GRN ENTRIES (${inwards.length} entries) ---`);
  for (const inw of inwards) {
    const plQty = inw.packingList?.reduce((s, p) => s + (Number(p.quantity) || 0), 0) || 0;
    const invQty = Number(inw.invoiceQty) || 0;
    const usedQty = plQty || invQty;
    const piRef = inw.purchaseInvoiceId;
    
    // Find the PI invoice number
    const linkedPi = pis.find(p => p._id.toString() === piRef?.toString());
    
    console.log(`  InwardID: ${inw.inwardId} | Status: ${inw.status} | PackingListQty: ${plQty} | InvoiceQty: ${invQty} | Used: ${usedQty} | PI: ${linkedPi?.invoiceNumber || piRef || 'NO PI'}`);
    if (inw.status !== 'DRAFT') totalInwardQty += usedQty;
  }
  console.log(`\n  TOTAL INWARDED QTY (non-draft): ${totalInwardQty}`);
  console.log(`\n=== FINAL COMPARISON ===`);
  console.log(`  PI Invoiced Qty   : ${totalPiQty}`);
  console.log(`  DI Qty            : ${totalDiQty}`);
  console.log(`  Total Invoiced    : ${totalPiQty + totalDiQty}`);
  console.log(`  Total Inwarded    : ${totalInwardQty}`);
  console.log(`  Difference        : ${(totalPiQty + totalDiQty) - totalInwardQty}`);

  process.exit(0);
}
run().catch(console.error);
