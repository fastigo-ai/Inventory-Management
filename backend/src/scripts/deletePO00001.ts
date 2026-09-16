import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../../.env') });

const MONGO_URI = 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0';

// Set to true only to actually delete, false = DRY RUN
const DRY_RUN = process.argv.includes('--dry-run') || !process.argv.includes('--confirm');

async function run() {
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db!;

  console.log(`\n${DRY_RUN ? '🔍 DRY RUN — No data will be deleted' : '🗑️  LIVE DELETE — Permanently removing data'}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // ─── 1. Find PO ────────────────────────────────────────
  const po = await db.collection('purchaseorders').findOne({
    purchaseOrderNumber: /PO-00001/i
  });

  if (!po) {
    console.log('❌ PO-00001 not found.');
    // show what numbers exist
    const all = await db.collection('purchaseorders').find({}).project({ purchaseOrderNumber: 1 }).toArray();
    console.log('Existing POs:', all.map((p: any) => p.purchaseOrderNumber).join(', '));
    process.exit(0);
  }

  const poId = po._id;
  console.log(`✅ PO Found: ${po.purchaseOrderNumber}  [${poId}]`);
  console.log(`   Vendor: ${po.vendorName || po.vendorId || '—'}`);
  console.log(`   Status: ${po.status || '—'}`);

  // ─── 2. Find connected Purchase Invoices ───────────────
  const pis = await db.collection('purchaseinvoices').find({
    $or: [{ purchaseOrderId: poId }, { purchaseOrderId: poId.toString() }]
  }).toArray();
  console.log(`\n📄 Purchase Invoices: ${pis.length}`);
  pis.forEach((p: any) => console.log(`   [${p._id}] ${p.invoiceNumber || p.purchaseOrderNumber || '—'}  status: ${p.status || '—'}`));

  const piIds = pis.map((p: any) => p._id);

  // ─── 3. Find Store Inward Entries linked to PO or any PI ─
  const inwardQuery: any[] = [
    { purchaseOrderId: poId },
    { purchaseOrderId: poId.toString() }
  ];
  if (piIds.length > 0) {
    inwardQuery.push({ purchaseInvoiceId: { $in: piIds } });
    inwardQuery.push({ purchaseInvoiceId: { $in: piIds.map((id: any) => id.toString()) } });
  }
  const inwards = await db.collection('storeinwardentries').find({ $or: inwardQuery }).toArray();
  console.log(`\n📦 Store Inward Entries (Receipts/IR): ${inwards.length}`);
  inwards.forEach((e: any) => console.log(`   [${e._id}] ${e.receiptNumber || e.entryNumber || e.irNumber || '—'}  status: ${e.status || '—'}`));

  const inwardIds = inwards.map((e: any) => e._id);

  // ─── 4. Find DI registers ──────────────────────────────
  const dis = await db.collection('diregisters').find({
    $or: [
      { purchaseOrderId: poId },
      { purchaseOrderId: poId.toString() },
      { purchaseInvoiceId: { $in: piIds } }
    ]
  }).toArray();
  console.log(`\n📋 DI Registers: ${dis.length}`);
  dis.forEach((d: any) => console.log(`   [${d._id}] ${d.diNumber || '—'}`));
  const diIds = dis.map((d: any) => d._id);

  // ─── Summary ───────────────────────────────────────────
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`WILL DELETE:`);
  console.log(`  🗑  1 Purchase Order         [${poId}]`);
  console.log(`  🗑  ${pis.length} Purchase Invoice(s)`);
  console.log(`  🗑  ${inwards.length} Store Inward Entry(ies)`);
  console.log(`  🗑  ${dis.length} DI Register(s)`);

  if (DRY_RUN) {
    console.log(`\n⚠️  DRY RUN complete. To actually delete, run:\n`);
    console.log(`  npx ts-node deletePO00001.ts --confirm\n`);
    process.exit(0);
  }

  // ─── DELETE ────────────────────────────────────────────
  console.log(`\n🚨 DELETING...`);

  const r1 = await db.collection('diregisters').deleteMany({ _id: { $in: diIds } });
  console.log(`  ✅ Deleted ${r1.deletedCount} DI Register(s)`);

  const r2 = await db.collection('storeinwardentries').deleteMany({ _id: { $in: inwardIds } });
  console.log(`  ✅ Deleted ${r2.deletedCount} Store Inward Entry(ies)`);

  const r3 = await db.collection('purchaseinvoices').deleteMany({ _id: { $in: piIds } });
  console.log(`  ✅ Deleted ${r3.deletedCount} Purchase Invoice(s)`);

  const r4 = await db.collection('purchaseorders').deleteOne({ _id: poId });
  console.log(`  ✅ Deleted ${r4.deletedCount} Purchase Order(s)`);

  console.log(`\n✅ Done. All data for PO-00001 has been permanently deleted.`);
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
