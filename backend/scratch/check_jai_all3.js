const { MongoClient, ObjectId } = require('mongodb');

async function run() {
  const client = new MongoClient('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  try {
    await client.connect();
    const db = client.db('test');
    
    let assignments = await db.collection('contractorassignments').find({
      contractorId: new ObjectId('6a7d97e60c356533fafa80e3')
    }).toArray();
    
    for (const a of assignments) {
      console.log(`MIN ${a.assignmentNumber}, Status: ${a.status}`);
      for (const item of (a.lineItems || [])) {
         if (item.itemName && item.itemName.toLowerCase().includes('stp 9')) {
             console.log(`  - Qty: ${item.quantity || item.demandQty}, LOA: ${item.loaSerialNo || item.loaSrNo}`);
         }
      }
    }
  } finally {
    await client.close();
  }
}
run().catch(console.dir);
