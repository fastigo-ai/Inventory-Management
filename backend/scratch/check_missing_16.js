const { MongoClient } = require('mongodb');

async function run() {
  const client = new MongoClient('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  try {
    await client.connect();
    const db = client.db('test');
    
    let assignments = await db.collection('contractorassignments').find({
      status: { $ne: 'Cancelled' }
    }).toArray();
    
    if (assignments.length === 0) {
      const db2 = client.db('inventory-management');
      assignments = await db2.collection('contractorassignments').find({
        status: { $ne: 'Cancelled' }
      }).toArray();
    }
    
    let sum = 0;
    for (const a of assignments) {
      if (!a.lineItems) continue;
      for (const item of a.lineItems) {
        if (item.itemName && item.itemName.toLowerCase().includes('stp') && item.itemName.toLowerCase().includes('9')) {
          const qty = Number(item.quantity || item.demandQty || 0);
          console.log(`[${a.circle}] MIN ${a.assignmentNumber}: ${qty} x ${item.itemName} (LOA: ${item.loaSerialNo || item.loaSrNo})`);
          if (a.circle?.toLowerCase() === 'rohru' || a.location?.toLowerCase() === 'rohru' || item.circle?.toLowerCase() === 'rohru') {
             sum += qty;
          }
        }
      }
    }
    console.log('Total Rohru Sum:', sum);
  } finally {
    await client.close();
  }
}
run().catch(console.dir);
