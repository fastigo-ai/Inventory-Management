const { MongoClient } = require('mongodb');
async function run() {
  const uri = "mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0";
  const client = new MongoClient(uri);
  await client.connect();
  const adminDb = client.db('admin');
  const dbs = await adminDb.admin().listDatabases();
  
  for (let dbInfo of dbs.databases) {
    const db = client.db(dbInfo.name);
    const collections = await db.listCollections().toArray();
    if (collections.some(c => c.name === 'purchaseinvoices')) {
      const pis = await db.collection('purchaseinvoices').find().sort({createdAt:-1}).limit(1).toArray();
      console.log(`DB: ${dbInfo.name} -> recent PI:`, pis.map(p => p.createdAt));
    }
  }
  await client.close();
}
run().catch(console.error);
