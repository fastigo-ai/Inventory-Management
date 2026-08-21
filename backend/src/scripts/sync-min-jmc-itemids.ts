import mongoose from 'mongoose';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function syncMinJmcBulk() {
  await mongoose.connect(process.env.MONGO_URI || '');
  console.log('Connected to MongoDB.');

  const db = mongoose.connection.db!;

  // ─── Build Master Item Lookup Maps ───────────────────────────────────────────
  const masterItems = await db.collection('items').find(
    { isDeleted: { $ne: true } },
    { projection: { dynamicData: 1 } }
  ).toArray();
  console.log(`Loaded ${masterItems.length} Master Items.`);

  const idToItem = new Map<string, any>();
  const keyToItem = new Map<string, any>();

  for (const it of masterItems) {
    const d = it.dynamicData || {};
    idToItem.set(it._id.toString(), it);
    const loa = String(d.loaSerialNo || d.loaSrNo || d.sku || '').trim();
    const pkg = String(d.package || '').trim().toLowerCase();
    const circ = String(d.circle || '').trim().toLowerCase();
    const tc = String(d.tempCode || '').trim();
    const name = String(d.name || '').trim().toLowerCase();

    if (loa && circ) {
      const k1 = `${pkg}___${circ}___${loa}`;
      if (!keyToItem.has(k1)) keyToItem.set(k1, it);
      const k2 = `${circ}___${loa}`;
      if (!keyToItem.has(k2)) keyToItem.set(k2, it);
    }
    if (tc && circ) {
      const k3 = `tc_${pkg}___${circ}___${tc}`;
      if (!keyToItem.has(k3)) keyToItem.set(k3, it);
      const k4 = `tc_${circ}___${tc}`;
      if (!keyToItem.has(k4)) keyToItem.set(k4, it);
    }
    if (name && circ) {
      const k5 = `name_${pkg}___${circ}___${name}`;
      if (!keyToItem.has(k5)) keyToItem.set(k5, it);
      const k6 = `name_${circ}___${name}`;
      if (!keyToItem.has(k6)) keyToItem.set(k6, it);
    }
  }

  function resolveItem(itemId: any, itemName: string, tempCode: string, loaSr: string, circle: string, pkg: string): any | null {
    const idStr = itemId ? itemId.toString() : '';
    const circ = circle.toLowerCase();
    const pkgL = pkg.toLowerCase();
    const nameL = (itemName || '').toLowerCase().trim();
    const loa = (loaSr || '').trim();
    const tc = (tempCode || '').trim();

    // 1. Existing itemId with matching circle
    if (idStr && idToItem.has(idStr)) {
      const existing = idToItem.get(idStr);
      const exCircle = String(existing.dynamicData?.circle || '').toLowerCase();
      if (!circ || exCircle.includes(circ) || circ.includes(exCircle)) return existing;
    }
    // 2. loaSerial + circle
    if (loa && circ) {
      const m = keyToItem.get(`${pkgL}___${circ}___${loa}`) || keyToItem.get(`${circ}___${loa}`);
      if (m) return m;
    }
    // 3. tempCode + circle
    if (tc && circ) {
      const m = keyToItem.get(`tc_${pkgL}___${circ}___${tc}`) || keyToItem.get(`tc_${circ}___${tc}`);
      if (m) return m;
    }
    // 4. name + circle
    if (nameL && circ) {
      const m = keyToItem.get(`name_${pkgL}___${circ}___${nameL}`) || keyToItem.get(`name_${circ}___${nameL}`);
      if (m) return m;
    }
    // 5. fallback: keep existing
    if (idStr && idToItem.has(idStr)) return idToItem.get(idStr);
    return null;
  }

  // ─── Fix MIN (ContractorAssignment) using bulkWrite ──────────────────────────
  console.log('\n=== Fixing MIN (ContractorAssignment) ===');
  const assignments = await db.collection('contractorassignments').find({}).toArray();
  console.log(`Found ${assignments.length} ContractorAssignment docs.`);

  const minBulkOps: any[] = [];
  let minLinesFixed = 0, minLinesTotal = 0;

  for (const doc of assignments) {
    const docCircle = String(doc.location || doc.circle || doc.division || '').trim();
    const docPkg = String(doc.package || '').trim();
    const lineItems = doc.lineItems || [];
    let docModified = false;

    const updatedLines = lineItems.map((line: any) => {
      minLinesTotal++;
      const lineCircle = String(line.circle || docCircle).trim();
      const linePkg = String(line.package || docPkg).trim();
      const loaSr = String(line.loaSerialNo || line.loaSrNo || line.sku || '').trim();
      const tc = String(line.tempCode || '').trim();
      const name = String(line.itemName || line.description || '').trim();

      const matched = resolveItem(line.itemId, name, tc, loaSr, lineCircle, linePkg);
      if (matched && (!line.itemId || line.itemId.toString() !== matched._id.toString())) {
        docModified = true;
        minLinesFixed++;
        return { ...line, itemId: matched._id };
      }
      return line;
    });

    if (docModified) {
      minBulkOps.push({ updateOne: { filter: { _id: doc._id }, update: { $set: { lineItems: updatedLines } } } });
    }
  }

  if (minBulkOps.length > 0) {
    const r = await db.collection('contractorassignments').bulkWrite(minBulkOps, { ordered: false });
    console.log(`MIN bulkWrite: ${r.modifiedCount} docs updated | ${minLinesFixed}/${minLinesTotal} lines fixed.`);
  } else {
    console.log(`MIN: No changes needed (${minLinesFixed}/${minLinesTotal} lines already correct).`);
  }

  // ─── Fix JMC (JmcRegister) using bulkWrite ───────────────────────────────────
  console.log('\n=== Fixing JMC (JmcRegister) ===');
  const jmcs = await db.collection('jmcregisters').find({}).toArray();
  console.log(`Found ${jmcs.length} JmcRegister docs.`);

  const jmcBulkOps: any[] = [];
  let jmcLinesFixed = 0, jmcLinesTotal = 0;

  for (const doc of jmcs) {
    const docCircle = String(doc.circle || doc.location || '').trim();
    const docPkg = String(doc.package || '').trim();
    const items = doc.items || [];
    let docModified = false;

    const updatedItems = items.map((item: any) => {
      jmcLinesTotal++;
      const itemCircle = String(item.circle || docCircle).trim();
      const itemPkg = String(item.package || docPkg).trim();
      const loaSr = String(item.loaSerialNo || item.loaSrNo || '').trim();
      const tc = String(item.tempCode || '').trim();
      const name = String(item.description || item.itemName || item.activity || '').trim();

      const matched = resolveItem(item.itemId, name, tc, loaSr, itemCircle, itemPkg);
      if (matched && (!item.itemId || item.itemId.toString() !== matched._id.toString())) {
        docModified = true;
        jmcLinesFixed++;
        return { ...item, itemId: matched._id };
      }
      return item;
    });

    if (docModified) {
      jmcBulkOps.push({ updateOne: { filter: { _id: doc._id }, update: { $set: { items: updatedItems } } } });
    }
  }

  if (jmcBulkOps.length > 0) {
    const r = await db.collection('jmcregisters').bulkWrite(jmcBulkOps, { ordered: false });
    console.log(`JMC bulkWrite: ${r.modifiedCount} docs updated | ${jmcLinesFixed}/${jmcLinesTotal} lines fixed.`);
  } else {
    console.log(`JMC: No changes needed (${jmcLinesFixed}/${jmcLinesTotal} lines already correct).`);
  }

  console.log('\n✅ MIN/JMC sync complete! Wait 45s for matrix cache to expire, then refresh the report.');
  await mongoose.disconnect();
}

syncMinJmcBulk().catch(console.error);
