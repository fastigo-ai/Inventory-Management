const { MongoClient } = require('mongodb');

async function run() {
  const client = new MongoClient('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  try {
    await client.connect();
    const db = client.db('test');
    
    let assignments = await db.collection('contractorassignments').find({
      $or: [{ circle: /Rohru/i }, { location: /Rohru/i }, { 'lineItems.circle': /Rohru/i }]
    }).toArray();
    
    if (assignments.length === 0) {
      const db2 = client.db('inventory-management');
      assignments = await db2.collection('contractorassignments').find({
        $or: [{ circle: /Rohru/i }, { location: /Rohru/i }, { 'lineItems.circle': /Rohru/i }]
      }).toArray();
    }
    
    let stpQty = 0;
    for (const a of assignments) {
      if (!a.lineItems) continue;
      for (const item of a.lineItems) {
        if (item.itemName && item.itemName.toLowerCase().includes('stp 9 mtr')) {
          const qty = Number(item.quantity || item.demandQty || 0);
          console.log(`[${a.status || 'Approved'}] Found ${qty} of ${item.itemName} in MIN ${a.assignmentNumber}`);
          stpQty += qty;
        }
      }
    }
    console.log('Total MIN Qty for STP 9 Meter Pole (including Cancelled):', stpQty);
  } finally {
    await client.close();
  }
}
run().catch(console.dir);
