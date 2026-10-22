import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || '');
  const db = mongoose.connection.db!;
  const inwards = await db.collection('storeinwardentries').find({
    circle: /solan/i,
    status: { $ne: 'Voided' }
  }).toArray();

  const tempCounts: Record<string, { name: string, totalQty: number, nalagarhQty: number }> = {};
  for (const inv of inwards) {
    const code = String(inv.tempCode || 'none');
    if (!tempCounts[code]) tempCounts[code] = { name: inv.itemName, totalQty: 0, nalagarhQty: 0 };
    const q = Number(inv.totalQty || inv.invoiceQty || 0);
    tempCounts[code].totalQty += q;
    if (inv.subcircle && inv.subcircle.toLowerCase().includes('nalagarh')) {
      tempCounts[code].nalagarhQty += q;
    }
  }

  // Print items 1, 2, 3, 4, 5
  ['1', '2', '3', '4', '5'].forEach(code => {
    console.log(`Temp ${code} (${tempCounts[code]?.name}): Solan Circle Total = ${tempCounts[code]?.totalQty}, Nalagarh Subcircle = ${tempCounts[code]?.nalagarhQty}`);
  });

  await mongoose.disconnect();
}
run().catch(console.error);
