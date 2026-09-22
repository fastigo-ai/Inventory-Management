const { MongoClient, ObjectId } = require('mongodb');

async function run() {
  const client = new MongoClient('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  try {
    await client.connect();
    const db = client.db('test');
    
    let contractor = await db.collection('contractors').findOne({ _id: new ObjectId('6a7ad89beb0c4079a65bafa3') });
    console.log(contractor);
  } finally {
    await client.close();
  }
}
run().catch(console.dir);
