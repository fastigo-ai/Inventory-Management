const { MongoClient } = require('mongodb');

async function run() {
  const client = new MongoClient('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  try {
    await client.connect();
    const db = client.db('test'); // usually 'test' in this atlas cluster unless overridden
    let assignments = await db.collection('contractorassignments').find({
      status: { $ne: 'Cancelled' },
      $or: [{ circle: /Rohru/i }, { location: /Rohru/i }, { 'lineItems.circle': /Rohru/i }]
    }).toArray();
    
    if (assignments.length === 0) {
      // try other db name if test is empty
      const db2 = client.db('inventory-management');
      assignments = await db2.collection('contractorassignments').find({
        status: { $ne: 'Cancelled' },
        $or: [{ circle: /Rohru/i }, { location: /Rohru/i }, { 'lineItems.circle': /Rohru/i }]
      }).toArray();
    }
    
    let stpQty = 0;
    for (const a of assignments) {
      if (!a.lineItems) continue;
      for (const item of a.lineItems) {
        if (item.itemName && item.itemName.toLowerCase().includes('stp')) {
          const qty = Number(item.quantity || item.demandQty || 0);
          console.log(`Found ${qty} of ${item.itemName} in MIN ${a.assignmentNumber} (LOA: ${item.loaSerialNo || item.loaSrNo}, TempCode: ${item.tempCode})`);
          stpQty += qty;
        }
      }
    }
    console.log('Total MIN Qty for STP 9 Meter Pole:', stpQty);
  } finally {
    await client.close();
  }
}
run().catch(console.dir);
