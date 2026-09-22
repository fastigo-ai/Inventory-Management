const { MongoClient } = require('mongodb');

async function run() {
  const client = new MongoClient('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  try {
    await client.connect();
    const db = client.db('test');
    
    let contractors = await db.collection('contractors').find({
      'dynamicData.companyName': { $regex: /Jai prakash/i }
    }).toArray();
    
    for (const c of contractors) {
       console.log(`Contractor: ${c.dynamicData.companyName}, ID: ${c._id}`);
       let assignments = await db.collection('contractorassignments').find({
          contractorId: c._id, status: { $ne: 'Cancelled' }
       }).toArray();
       console.log(`  -> Assignments: ${assignments.length}`);
       for (const a of assignments) {
          console.log(`     - MIN ${a.assignmentNumber}, Circle: ${a.circle}`);
       }
    }
  } finally {
    await client.close();
  }
}
run().catch(console.dir);
