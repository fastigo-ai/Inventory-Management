import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || '');
  const db = mongoose.connection.db!;
  const col = db.collection('storeinwardentries');

  // Let's test what storeItemisedSummary query returns vs with { status: { $ne: 'Voided' } }
  const totalVoided = await col.countDocuments({ status: 'Voided' });
  console.log('Total voided:', totalVoided);

  // Nalagarh query test
  const nalagarhEntries = await col.find({
    $or: [{ circle: /solan/i }, { store: /nalagarh/i }, { subcircle: /nalagarh/i }]
  }).toArray();

  let unverifiedSum = 0;
  let voidedSum = 0;
  let activeSum = 0;

  nalagarhEntries.forEach(e => {
    const qty = Number(e.totalQty || e.invoiceQty || e.acceptedQty || e.receivedQty || 0);
    if (e.status === 'Voided') {
      voidedSum += qty;
    } else {
      activeSum += qty;
    }
  });

  console.log('Nalagarh - Total entries:', nalagarhEntries.length);
  console.log('Nalagarh - Active Inward Qty:', activeSum);
  console.log('Nalagarh - Voided Inward Qty:', voidedSum);
  console.log('Nalagarh - Total including Voided:', activeSum + voidedSum);

  // Also check PurchaseInvoice (PI) vs StoreInwardEntry for Solan / Nalagarh
  const piCol = db.collection('purchaseinvoices');
  const pis = await piCol.find({
    status: { $ne: 'Cancelled' },
    $or: [{ circle: /solan/i }, { store: /nalagarh/i }, { 'lineItems.circle': /solan/i }]
  }).toArray();

  let piQty = 0;
  pis.forEach(p => {
    (p.lineItems || []).forEach((li: any) => {
      piQty += Number(li.quantity || li.invoiceQuantity || 0);
    });
  });
  console.log('PI (Purchase Invoices) count:', pis.length, 'total PI Qty:', piQty);

  await mongoose.disconnect();
}
run().catch(console.error);
