const { MongoClient } = require('mongodb');

async function run() {
  const client = new MongoClient('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  try {
    await client.connect();
    const db = client.db('test');
    
    let contractors = await db.collection('contractors').find({
      companyName: { $regex: /jai/i }
    }).toArray();
    
    if (contractors.length === 0) {
      const db2 = client.db('inventory-management');
      contractors = await db2.collection('contractors').find({
        companyName: { $regex: /jai/i }
      }).toArray();
    }
    
    for (const contractor of contractors) {
       console.log(`Found contractor: ${contractor.companyName} (${contractor._id})`);
    }
  } finally {
    await client.close();
  }
}
run().catch(console.dir);
