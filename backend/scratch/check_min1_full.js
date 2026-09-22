const { MongoClient } = require('mongodb');

async function run() {
  const client = new MongoClient('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  try {
    await client.connect();
    const db = client.db('test');
    
    let a = await db.collection('contractorassignments').findOne({ assignmentNumber: '1', circle: /ROHRU/i });
    console.log(`MIN 1 (Rohru) Line Items:`);
    for (const item of a.lineItems) {
      console.log(`  - Qty: ${item.quantity}, ItemName: '${item.itemName}', LOA: ${item.loaSerialNo || item.loaSrNo}`);
    }
  } finally {
    await client.close();
  }
}
run().catch(console.dir);
