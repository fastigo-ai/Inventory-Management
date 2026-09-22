const { MongoClient } = require('mongodb');

async function run() {
  const client = new MongoClient('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  try {
    await client.connect();
    const db = client.db('test');
    
    let assignments = await db.collection('contractorassignments').find().toArray();
    
    if (assignments.length === 0) {
      const db2 = client.db('inventory-management');
      assignments = await db2.collection('contractorassignments').find().toArray();
    }
    
    const names = new Set();
    for (const a of assignments) {
      if (a.contractorName) names.add(a.contractorName);
    }
    console.log(Array.from(names));
  } finally {
    await client.close();
  }
}
run().catch(console.dir);
