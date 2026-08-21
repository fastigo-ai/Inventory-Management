import mongoose from 'mongoose';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function verifyMinJmc() {
  await mongoose.connect(process.env.MONGO_URI || '');
  const db = mongoose.connection.db!;

  // Load items
  const items = await db.collection('items').find(
    { isDeleted: { $ne: true } },
    { projection: { dynamicData: 1 } }
  ).toArray();

  const idToMeta = new Map<string, any>();
  for (const it of items) {
    const d = it.dynamicData || {};
    idToMeta.set(it._id.toString(), {
      circle: d.circle || '',
      loa: d.loaSerialNo || d.sku || '',
      name: d.name || ''
    });
  }

  // ── MIN check ──────────────────────────────────────────────────────────────
  const assignments = await db.collection('contractorassignments').find({}).toArray();
  const minCircle: Record<string, number> = { solan: 0, nahan: 0, rampur: 0, rohru: 0, unknown: 0 };
  let minTotal = 0, minWithId = 0, minResolved = 0;

  for (const doc of assignments) {
    const docCircle = (doc.location || doc.circle || '').toLowerCase();
    for (const line of (doc.lineItems || [])) {
      minTotal++;
      const qty = Number(line.quantity || 0);
      if (!qty) continue;
      const idStr = line.itemId ? line.itemId.toString() : '';
      if (idStr) {
        minWithId++;
        const meta = idToMeta.get(idStr);
        if (meta) {
          minResolved++;
          const c = (meta.circle || docCircle).toLowerCase();
          if (c.includes('solan')) minCircle.solan += qty;
          else if (c.includes('nahan')) minCircle.nahan += qty;
          else if (c.includes('rampur')) minCircle.rampur += qty;
          else if (c.includes('rohru')) minCircle.rohru += qty;
          else minCircle.unknown += qty;
        }
      }
    }
  }

  console.log('=== MIN (ContractorAssignment) ===');
  console.log(`Total line items: ${minTotal} | With itemId: ${minWithId} | Resolved to master: ${minResolved}`);
  console.log('Qty by circle:', JSON.stringify(minCircle, null, 2));

  // ── JMC check ──────────────────────────────────────────────────────────────
  const jmcs = await db.collection('jmcregisters').find({}).toArray();
  const jmcCircle: Record<string, number> = { solan: 0, nahan: 0, rampur: 0, rohru: 0, unknown: 0 };
  let jmcTotal = 0, jmcResolved = 0;

  for (const doc of jmcs) {
    const docCircle = (doc.circle || '').toLowerCase();
    for (const item of (doc.items || [])) {
      jmcTotal++;
      const qty = Number(item.approvedQty || item.claimedQty || 0);
      if (!qty) continue;
      const idStr = item.itemId ? item.itemId.toString() : '';
      const meta = idStr ? idToMeta.get(idStr) : null;
      const c = (meta?.circle || docCircle).toLowerCase();
      if (c.includes('solan')) jmcCircle.solan += qty;
      else if (c.includes('nahan')) jmcCircle.nahan += qty;
      else if (c.includes('rampur')) jmcCircle.rampur += qty;
      else if (c.includes('rohru')) jmcCircle.rohru += qty;
      else jmcCircle.unknown += qty;
      if (idStr && idToMeta.has(idStr)) jmcResolved++;
    }
  }

  console.log('\n=== JMC (JmcRegister) ===');
  console.log(`Total items: ${jmcTotal} | Resolved to master: ${jmcResolved}`);
  console.log('Qty by circle:', JSON.stringify(jmcCircle, null, 2));

  await mongoose.disconnect();
}

verifyMinJmc().catch(console.error);
