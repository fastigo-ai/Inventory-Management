import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || '');
  const db = mongoose.connection.db!;
  const col = db.collection('storeinwardentries');
  const nalagarhEntries = await col.find({
    status: { $ne: 'Voided' },
    $or: [
      { circle: /nalagarh/i },
      { subcircle: /nalagarh/i },
      { billingFrom: /nalagarh/i },
      { store: /nalagarh/i }
    ]
  }).toArray();

  console.log('Nalagarh entries count:', nalagarhEntries.length);
  const byItem: Record<string, { tempCode: string, name: string, qty: number }> = {};
  for (const e of nalagarhEntries) {
    const k = e.tempCode || e.itemName || 'unknown';
    if (!byItem[k]) byItem[k] = { tempCode: e.tempCode, name: e.itemName, qty: 0 };
    byItem[k].qty += Number(e.totalQty || e.invoiceQty || 0);
  }
  console.log('Nalagarh by item:', byItem);

  // Also check distinct stores in storeinwardentries where circle = Solan
  const solanInwards = await col.find({
    status: { $ne: 'Voided' },
    circle: /solan/i
  }).toArray();
  const storesInSolan: Record<string, number> = {};
  for (const s of solanInwards) {
    const st = s.store || s.subcircle || 'UNSPECIFIED_STORE';
    storesInSolan[st] = (storesInSolan[st] || 0) + Number(s.totalQty || s.invoiceQty || 0);
  }
  console.log('Stores in Solan Inwards:', storesInSolan);

  await mongoose.disconnect();
}
run().catch(console.error);
