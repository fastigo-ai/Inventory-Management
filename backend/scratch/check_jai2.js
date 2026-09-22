const { MongoClient } = require('mongodb');

async function run() {
  const client = new MongoClient('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  try {
    await client.connect();
    const db = client.db('test');
    
    let contractor = await db.collection('contractors').findOne({ 'dynamicData.companyName': /Jai prakash/i });
    console.log(`Contractor Name: ${contractor?.dynamicData?.companyName}, ID: ${contractor?._id}`);
    
    let assignments = await db.collection('contractorassignments').find({
      contractorId: contractor?._id,
      status: { $ne: 'Cancelled' }
    }).toArray();
    
    let sum = 0;
    for (const a of assignments) {
      if (!a.lineItems) continue;
      for (const item of a.lineItems) {
        if (item.itemName && item.itemName.toLowerCase().includes('stp') && item.itemName.toLowerCase().includes('9')) {
          const qty = Number(item.quantity || item.demandQty || 0);
          console.log(`MIN ${a.assignmentNumber}, Circle: ${a.circle}, Qty: ${qty} (LOA: ${item.loaSerialNo || item.loaSrNo})`);
          sum += qty;
        }
      }
    }
    console.log('Total for Jai Prakash:', sum);
  } finally {
    await client.close();
  }
}
run().catch(console.dir);
