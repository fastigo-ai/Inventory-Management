import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../../.env') });

const MONGO_URI = 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0';

async function inspect() {
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db!;

  // 1. Find PO-00001
  const po = await db.collection('purchaseorders').findOne({
    $or: [
      { poNumber: /PO-00001/i },
      { poNo: /PO-00001/i },
      { orderNumber: /PO-00001/i },
    ]
  });

  if (!po) {
    console.log('❌ PO-00001 not found. Listing all POs:');
    const all = await db.collection('purchaseorders').find({}).project({ poNumber: 1, poNo: 1, orderNumber: 1, _id: 1 }).limit(20).toArray();
    all.forEach((p: any) => console.log(`  [${p._id}] ${p.poNumber || p.poNo || p.orderNumber || 'no-number'}`));
    process.exit(0);
  }

  console.log(`✅ Found PO: ${po.poNumber || po.poNo || po.orderNumber}`);
  console.log(`   ID: ${po._id}`);
  console.log(`   Vendor: ${po.vendorName || po.vendorId}`);
  console.log(`   Status: ${po.status}`);

  const poId = po._id;

  // 2. Find connected Purchase Invoices (PI)
  const pis = await db.collection('purchaseinvoices').find({
    $or: [
      { purchaseOrderId: poId },
      { purchaseOrderId: poId.toString() },
      { poId: poId },
    ]
  }).toArray();
  console.log(`\n  📄 Purchase Invoices (PI): ${pis.length}`);
  pis.forEach((p: any) => console.log(`     [${p._id}] ${p.invoiceNumber || p.piNumber || 'no-number'}`));

  // 3. Find connected Store Inward Entries / Receipts
  const inwards = await db.collection('storeinwardentries').find({
    $or: [
      { purchaseOrderId: poId },
      { purchaseOrderId: poId.toString() },
      { poId: poId },
      { poReference: poId },
    ]
  }).toArray();
  console.log(`\n  📦 Store Inward Entries (Receipts/IR): ${inwards.length}`);
  inwards.forEach((e: any) => console.log(`     [${e._id}] ${e.receiptNumber || e.entryNumber || e.irNumber || 'no-number'}`));

  // 4. Find DIRegister entries linked to this PO
  const dis = await db.collection('diregisters').find({
    $or: [
      { purchaseOrderId: poId },
      { purchaseOrderId: poId.toString() },
      { poId: poId }
    ]
  }).toArray();
  console.log(`\n  📋 DI Registers: ${dis.length}`);
  dis.forEach((d: any) => console.log(`     [${d._id}] ${d.diNumber || 'no-number'}`));

  // Summary
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`WILL DELETE:`);
  console.log(`  ➡ 1 Purchase Order      [${poId}]`);
  console.log(`  ➡ ${pis.length} Purchase Invoice(s)  ${pis.map((p: any) => '[' + p._id + ']').join(', ')}`);
  console.log(`  ➡ ${inwards.length} Store Inward Entry(ies) ${inwards.map((e: any) => '[' + e._id + ']').join(', ')}`);
  console.log(`  ➡ ${dis.length} DI Register(s) ${dis.map((d: any) => '[' + d._id + ']').join(', ')}`);
  console.log(`\nRun deletePO00001.ts to confirm and delete.`);

  process.exit(0);
}

inspect().catch(e => { console.error(e); process.exit(1); });
