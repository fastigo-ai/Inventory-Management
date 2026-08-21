import mongoose from 'mongoose';

const DB_URI = 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0?retryWrites=true&w=majority';

async function run() {
  await mongoose.connect(DB_URI);
  console.log('Connected to DB');
  const db = mongoose.connection.db;
  if (!db) return;

  const stps = await db.collection('items').find({ 'dynamicData.name': { $regex: /STP 9/i } }).toArray();
  const stpIds = stps.map(i => i._id.toString());
  console.log(`Found ${stpIds.length} Master Items matching /STP 9/i`);

  const dis = await db.collection('dis').find().toArray();
  console.log(`\nFound ${dis.length} total DI Records`);

  const diByLoa: Record<string, { totalQty: number, diNos: string[] }> = {};

  for (const doc of dis) {
    for (const item of doc.lineItems || []) {
      const isMatch = (item.description && item.description.toUpperCase().includes('STP 9')) ||
                      (item.itemName && item.itemName.toUpperCase().includes('STP 9')) ||
                      (item.itemId && stpIds.includes(item.itemId.toString()));
      if (isMatch) {
        const qty = Number(item.quantity || 0);
        const loa = item.loaSerialNo || item.loaSrNo || 'Missing LOA';
        console.log(`DI No: ${doc.diNumber || doc._id} | Circle: ${item.circle || doc.circle} | Qty: ${qty} | LOA: ${loa} | Desc: ${item.itemName || item.description}`);
        
        if (!diByLoa[loa]) {
          diByLoa[loa] = { totalQty: 0, diNos: [] };
        }
        diByLoa[loa].totalQty += qty;
        if (!diByLoa[loa].diNos.includes(doc.diNumber || doc._id.toString())) {
            diByLoa[loa].diNos.push(doc.diNumber || doc._id.toString());
        }
      }
    }
  }

  console.log('\n--- DI Breakdown by LOA Serial Number ---');
  for (const loa in diByLoa) {
    console.log(`LOA Serial No: ${loa.padEnd(5)} | Total Qty: ${diByLoa[loa].totalQty.toString().padEnd(6)} | DI Nos: ${diByLoa[loa].diNos.join(', ')}`);
  }

  process.exit(0);
}

run().catch(console.error);
