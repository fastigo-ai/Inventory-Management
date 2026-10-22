import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || '');
  const db = mongoose.connection.db!;
  const col = db.collection('storeinwardentries');

  // Breakdown of subcircle / store in Solan entries
  const solanEntries = await col.find({
    status: { $ne: 'Voided' },
    circle: /solan/i
  }).toArray();

  const subcircles: Record<string, { count: number, qty: number }> = {};
  const stores: Record<string, { count: number, qty: number }> = {};

  for (const doc of solanEntries) {
    const sc = doc.subcircle || 'NONE';
    const st = doc.store || 'NONE';
    const q = Number(doc.totalQty || doc.invoiceQty || 0);

    if (!subcircles[sc]) subcircles[sc] = { count: 0, qty: 0 };
    subcircles[sc].count++;
    subcircles[sc].qty += q;

    if (!stores[st]) stores[st] = { count: 0, qty: 0 };
    stores[st].count++;
    stores[st].qty += q;
  }

  console.log('Solan Inward Subcircles:', subcircles);
  console.log('Solan Inward Stores:', stores);

  await mongoose.disconnect();
}
run().catch(console.error);
