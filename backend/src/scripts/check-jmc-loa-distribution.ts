import mongoose from 'mongoose';

const DB_URI = 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0?retryWrites=true&w=majority';

async function run() {
  await mongoose.connect(DB_URI);
  console.log('Connected to DB');
  const db = mongoose.connection.db;
  if (!db) return;

  const stps = await db.collection('items').find({ 'dynamicData.itemName': { $regex: /STP/i } }).toArray();
  const tcs = Array.from(new Set(stps.map(i => i.dynamicData.tempCode)));
  
  // Also just find ALL JMCs where item description contains STP
  const jmcs = await db.collection('jmcregisters').find({ 'items.description': { $regex: /STP/i } }).toArray();
  console.log(`\nFound ${jmcs.length} JMC Records with STP`);

  const jmcByLoa: Record<string, { totalQty: number, jmcNos: string[] }> = {};

  for (const jmc of jmcs) {
    for (const item of jmc.items || []) {
      if ((item.description || '').toLowerCase().includes('stp')) {
        const qty = Number(item.claimedQty || item.approvedQty || 0);
        const loa = item.loaSerialNo || 'Missing LOA';
        
        if (!jmcByLoa[loa]) {
          jmcByLoa[loa] = { totalQty: 0, jmcNos: [] };
        }
        jmcByLoa[loa].totalQty += qty;
        if (!jmcByLoa[loa].jmcNos.includes(jmc.jmcNo)) {
            jmcByLoa[loa].jmcNos.push(jmc.jmcNo);
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
