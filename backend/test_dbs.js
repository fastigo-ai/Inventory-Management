const { MongoClient } = require('mongodb');
async function run() {
  const uri = "mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0";
  const client = new MongoClient(uri);
  await client.connect();
  const dbs = await client.db().admin().listDatabases();
  console.log("Databases:", dbs.databases.map(d => d.name));
  await client.close();
}
run().catch(console.error);
