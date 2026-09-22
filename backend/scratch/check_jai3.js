const { MongoClient } = require('mongodb');

async function run() {
  const client = new MongoClient('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  try {
    await client.connect();
    const db = client.db('test');
    
    let contractor = await db.collection('contractors').findOne({ 'dynamicData.companyName': /Jai prakash/i });
    
    let assignments = await db.collection('contractorassignments').find({
      contractorId: contractor?._id,
      status: { $ne: 'Cancelled' }
    }).toArray();
    
    for (const a of assignments) {
      if (a.circle?.toLowerCase() === 'rohru' || a.location?.toLowerCase() === 'rohru') {
         console.log(`MIN ${a.assignmentNumber}`);
         for (const item of a.lineItems) {
            if (item.loaSerialNo === '104' || item.loaSrNo === '104') {
               console.log(`  - Found LOA 104: Qty ${item.quantity || item.demandQty}, Name: '${item.itemName}'`);
            }
         }
      }
    }
  } finally {
    await client.close();
  }
}
run().catch(console.dir);
