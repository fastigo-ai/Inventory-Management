const { MongoClient } = require('mongodb');

async function run() {
  const client = new MongoClient('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  try {
    await client.connect();
    const db = client.db('test');
    const jmc = await db.collection('jmcregisters').findOne({});
    console.log("JMC:", jmc);
  } finally {
    await client.close();
  }
}
run().catch(console.dir);
