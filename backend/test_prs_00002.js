const { MongoClient } = require('mongodb');
async function run() {
  const uri = "mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0";
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('test');
  
  const prs = await db.collection('prs').find({ prNumber: /00002/i }).toArray();
  console.log("PRs:", prs.map(p => p.prNumber));

  const pos = await db.collection('purchaseorders').find({ purchaseOrderNumber: /00002/i }).toArray();
  console.log("POs:", pos.map(p => p.purchaseOrderNumber));

  await client.close();
}
run().catch(console.error);
