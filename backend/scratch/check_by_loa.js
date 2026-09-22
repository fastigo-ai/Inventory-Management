const { MongoClient } = require('mongodb');

async function run() {
  const client = new MongoClient('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  try {
    await client.connect();
    const db = client.db('test');
    
    let assignments = await db.collection('contractorassignments').find({
      status: { $ne: 'Cancelled' },
      $or: [{ circle: /Rohru/i }, { location: /Rohru/i }, { 'lineItems.circle': /Rohru/i }]
    }).toArray();
    
    if (assignments.length === 0) {
      const db2 = client.db('inventory-management');
      assignments = await db2.collection('contractorassignments').find({
        status: { $ne: 'Cancelled' },
        $or: [{ circle: /Rohru/i }, { location: /Rohru/i }, { 'lineItems.circle': /Rohru/i }]
      }).toArray();
    }
    
    let targetLoas = ['5', '21', '216', '560', '593', '680', '1363', '1380', '1630', '1664', '1698', '2026'];
    let sum = 0;
    
    for (const a of assignments) {
      if (!a.lineItems) continue;
      for (const item of a.lineItems) {
        const loa = String(item.loaSerialNo || item.loaSrNo || '').trim();
        const tc = String(item.tempCode || '').trim();
        if (tc === '1' && targetLoas.includes(loa)) {
          const qty = Number(item.quantity || item.demandQty || 0);
          console.log(`Matched! MIN ${a.assignmentNumber}: ${qty} of '${item.itemName}' (LOA: ${loa})`);
          sum += qty;
        }
      }
    }
    console.log('Total by LOA & TempCode 1:', sum);
  } finally {
    await client.close();
  }
}
run().catch(console.dir);
