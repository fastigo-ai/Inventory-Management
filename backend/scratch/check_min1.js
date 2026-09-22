const { MongoClient } = require('mongodb');

async function run() {
  const client = new MongoClient('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  try {
    await client.connect();
    const db = client.db('test');
    
    let assignment = await db.collection('contractorassignments').findOne({ assignmentNumber: '1' });
    console.log(`MIN 1 Contractor ID: ${assignment.contractorId}`);
    
    if (assignment.contractorId) {
       let contractor = await db.collection('contractors').findOne({ _id: assignment.contractorId });
       console.log(`Contractor Name: ${contractor?.companyName || 'Not Found'}`);
    }
    
    let min4 = await db.collection('contractorassignments').findOne({ assignmentNumber: '4' });
    if (min4 && min4.contractorId) {
       let contractor4 = await db.collection('contractors').findOne({ _id: min4.contractorId });
       console.log(`MIN 4 Contractor Name: ${contractor4?.companyName || 'Not Found'}`);
    }
  } finally {
    await client.close();
  }
}
run().catch(console.dir);
