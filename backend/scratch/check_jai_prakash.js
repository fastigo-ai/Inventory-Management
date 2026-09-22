const { MongoClient } = require('mongodb');

async function run() {
  const client = new MongoClient('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  try {
    await client.connect();
    const db = client.db('test');
    
    let assignments = await db.collection('contractorassignments').find({
      status: { $ne: 'Cancelled' },
      contractorName: { $regex: /Jai prakash/i },
      $or: [{ circle: /Rohru/i }, { location: /Rohru/i }, { 'lineItems.circle': /Rohru/i }]
    }).toArray();
    
    if (assignments.length === 0) {
      const db2 = client.db('inventory-management');
      assignments = await db2.collection('contractorassignments').find({
        status: { $ne: 'Cancelled' },
        contractorName: { $regex: /Jai prakash/i },
        $or: [{ circle: /Rohru/i }, { location: /Rohru/i }, { 'lineItems.circle': /Rohru/i }]
      }).toArray();
    }
    
    for (const a of assignments) {
      console.log(`MIN ${a.assignmentNumber} for ${a.contractorName} in ${a.circle}`);
      if (!a.lineItems) continue;
      for (const item of a.lineItems) {
        if (item.itemName && item.itemName.toLowerCase().includes('stp')) {
          const qty = Number(item.quantity || item.demandQty || 0);
          console.log(`  - ${qty} of ${item.itemName} (LOA: ${item.loaSerialNo || item.loaSrNo})`);
        }
      }
    }
  } finally {
    await client.close();
  }
}
run().catch(console.dir);
