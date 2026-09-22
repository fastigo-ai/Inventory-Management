const { MongoClient } = require('mongodb');

async function run() {
  const client = new MongoClient('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  try {
    await client.connect();
    const db = client.db('test');
    
    // Find contractor
    let contractor = await db.collection('contractors').findOne({
      companyName: { $regex: /Jai prakash/i }
    });
    
    if (!contractor) {
      const db2 = client.db('inventory-management');
      contractor = await db2.collection('contractors').findOne({
        companyName: { $regex: /Jai prakash/i }
      });
      if (!contractor) {
        console.log("Could not find contractor Jai Prakash");
        return;
      }
      var dbUsed = db2;
    } else {
      var dbUsed = db;
    }
    
    console.log(`Found contractor: ${contractor.companyName} (${contractor._id})`);
    
    let assignments = await dbUsed.collection('contractorassignments').find({
      status: { $ne: 'Cancelled' },
      contractorId: contractor._id,
      $or: [{ circle: /Rohru/i }, { location: /Rohru/i }, { 'lineItems.circle': /Rohru/i }]
    }).toArray();
    
    let total = 0;
    for (const a of assignments) {
      console.log(`MIN ${a.assignmentNumber}, Circle=${a.circle}, Location=${a.location}`);
      if (!a.lineItems) continue;
      for (const item of a.lineItems) {
        if (item.itemName && item.itemName.toLowerCase().includes('stp') && item.itemName.toLowerCase().includes('9')) {
          const qty = Number(item.quantity || item.demandQty || 0);
          console.log(`  - ${qty} of ${item.itemName} (LOA: ${item.loaSerialNo || item.loaSrNo})`);
          total += qty;
        }
      }
    }
    console.log('Total for Jai Prakash:', total);
  } finally {
    await client.close();
  }
}
run().catch(console.dir);
