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
  for (const stp of stps) {
      console.log(`  - [${stp._id}] ${stp.dynamicData.name} (LOA: ${stp.dynamicData.loaSerialNo})`);
  }

  const jmcs = await db.collection('jmcregisters').find().toArray();
  console.log(`\nFound ${jmcs.length} total JMC Records`);

  const jmcByLoa: Record<string, { totalQty: number, jmcNos: string[] }> = {};

  for (const jmc of jmcs) {
    for (const item of jmc.items || []) {
      const isMatch = (item.description && item.description.toUpperCase().includes('STP 9')) ||
                      (item.itemId && stpIds.includes(item.itemId.toString()));
      if (isMatch) {
        const qty = Number(item.claimedQty || item.approvedQty || 0);
        const loa = item.loaSerialNo || 'Missing LOA';
        console.log(`JMC No: ${jmc.jmcNumber || jmc._id} | Circle: ${jmc.circle} | Qty: ${qty} | LOA: ${loa} | Desc: ${item.description}`);
        
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
