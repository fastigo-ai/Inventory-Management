const { MongoClient } = require('mongodb');

async function run() {
  const client = new MongoClient('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  try {
    await client.connect();
    const db = client.db('test');
    
    let a = await db.collection('contractorassignments').findOne({ assignmentNumber: '1', circle: /ROHRU/i });
    
    for (const item of a.lineItems) {
      if (item.tempCode == '1' || item.tempCode == 1) {
        console.log(`TempCode 1 found! Qty: ${item.quantity}, Name: '${item.itemName}', LOA: '${item.loaSerialNo || item.loaSrNo}', ID: ${item.itemId}`);
      }
    }
  } finally {
    await client.close();
  }
}
run().catch(console.dir);
