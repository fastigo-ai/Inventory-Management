const { MongoClient } = require('mongodb');

async function run() {
  const client = new MongoClient('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  try {
    await client.connect();
    const db = client.db('test');
    
    const assignments = await db.collection('contractorassignments').find({
       assignmentNumber: { $in: ['1', '3', '4'] },
       status: { $ne: 'Cancelled' }
    }).toArray();
    
    for (const a of assignments) {
      console.log(`MIN ${a.assignmentNumber}: Circle=${a.circle}, Location=${a.location}`);
    }
  } finally {
    await client.close();
  }
}
run().catch(console.dir);
