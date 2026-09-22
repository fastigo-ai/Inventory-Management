const { MongoClient } = require('mongodb');

async function run() {
  const client = new MongoClient('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  try {
    await client.connect();
    const db = client.db('test');
    
    let workOrders = await db.collection('contractorworkorders').find({
      circle: /Rohru/i
    }).toArray();
    
    if (workOrders.length === 0) {
      const db2 = client.db('inventory-management');
      workOrders = await db2.collection('contractorworkorders').find({
        circle: /Rohru/i
      }).toArray();
    }
    
    let sum = 0;
    for (const wo of workOrders) {
      if (!wo.items) continue;
      for (const item of wo.items) {
        if (item.itemName && item.itemName.toLowerCase().includes('stp 9')) {
          const qty = Number(item.quantity || item.demandQty || item.boqQty || 0);
          sum += qty;
        }
      }
    }
    console.log('Total Demand Qty for STP 9 in Rohru:', sum);
  } finally {
    await client.close();
  }
}
run().catch(console.dir);
