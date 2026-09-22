const { MongoClient } = require('mongodb');

async function run() {
  const client = new MongoClient('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  try {
    await client.connect();
    const db = client.db('test');
    
    let assignments = await db.collection('contractorassignments').find({
      status: { $ne: 'Cancelled' },
      contractorName: { $regex: /Jai prakash/i }
    }).toArray();
    
    if (assignments.length === 0) {
      const db2 = client.db('inventory-management');
      assignments = await db2.collection('contractorassignments').find({
        status: { $ne: 'Cancelled' },
        contractorName: { $regex: /Jai prakash/i }
      }).toArray();
    }
    
    for (const a of assignments) {
      console.log(`MIN ${a.assignmentNumber} for ${a.contractorName}, Circle=${a.circle}, Location=${a.location}`);
      if (!a.lineItems) continue;
      for (const item of a.lineItems) {
        if (item.itemName && item.itemName.toLowerCase().includes('stp')) {
          const qty = Number(item.quantity || item.demandQty || 0);
          console.log(`  - ${qty} of ${item.itemName} (LOA: ${item.loaSerialNo || item.loaSrNo}, Circle: ${item.circle})`);
        }
      }
    }
  } finally {
    await client.close();
  }
}
run().catch(console.dir);
