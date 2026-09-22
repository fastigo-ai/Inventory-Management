const { MongoClient } = require('mongodb');

async function run() {
  const client = new MongoClient('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  try {
    await client.connect();
    const adminDb = client.db('admin');
    const result = await adminDb.admin().listDatabases();
    console.log(result.databases.map(db => db.name));
  } finally {
    await client.close();
  }
}
run().catch(console.dir);
