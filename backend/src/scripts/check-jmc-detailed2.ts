import mongoose from 'mongoose';

const DB_URI = 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0?retryWrites=true&w=majority';

async function run() {
  await mongoose.connect(DB_URI);
  console.log('Connected to DB');
  const db = mongoose.connection.db;
  if (!db) return;

  const stps = await db.collection('items').find({ 'dynamicData.itemName': 'STP 9 MTR' }).toArray();
  const stpIds = stps.map(i => i._id);
  console.log(`Found ${stpIds.length} Master Items for STP 9 MTR`);

  const jmcs = await db.collection('jmcregisters').find({ 'items.itemId': { $in: stpIds } }).toArray();
  console.log(`\nFound ${jmcs.length} JMC Records containing STP 9 MTR items`);

  const jmcByLoa: Record<string, { totalQty: number, jmcNos: string[] }> = {};

  for (const jmc of jmcs) {
    for (const item of jmc.items || []) {
      if (stpIds.some(id => id.equals(item.itemId))) {
        const qty = Number(item.claimedQty || item.approvedQty || 0);
        const loa = item.loaSerialNo || 'Missing LOA';
        console.log(`JMC No: ${jmc.jmcNumber || jmc._id} | Circle: ${jmc.circle} | Qty: ${qty} | LOA: ${loa} | ItemId: ${item.itemId}`);
        
        if (!jmcByLoa[loa]) {
          jmcByLoa[loa] = { totalQty: 0, jmcNos: [] };
        }
        jmcByLoa[loa].totalQty += qty;
        if (!jmcByLoa[loa].jmcNos.includes(jmc.jmcNumber || jmc._id.toString())) {
            jmcByLoa[loa].jmcNos.push(jmc.jmcNumber || jmc._id.toString());
        }
      }
    }
  }

  console.log('\n--- JMC Breakdown by LOA Serial Number ---');
  for (const loa in jmcByLoa) {
    console.log(`LOA Serial No: ${loa.padEnd(5)} | Total Qty: ${jmcByLoa[loa].totalQty.toString().padEnd(6)} | JMC Nos: ${jmcByLoa[loa].jmcNos.join(', ')}`);
  }

  process.exit(0);
}

run().catch(console.error);
