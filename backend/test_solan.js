const { MongoClient } = require('mongodb');
async function run() {
  const uri = "mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0";
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('test');
  
  const dis = await db.collection('dis').find({ "lineItems.circle": /Solan/i }).sort({createdAt:-1}).limit(1).toArray();
  console.log("Recent DI with Solan:", JSON.stringify(dis.map(d=>({ id: d._id, date: d.createdAt }))));

  const pis = await db.collection('purchaseinvoices').find({ "lineItems.circle": /Solan/i }).sort({createdAt:-1}).limit(1).toArray();
  console.log("Recent PI with Solan:", JSON.stringify(pis.map(p=>({ id: p._id, date: p.createdAt }))));

  const inwards = await db.collection('storeinwardentries').find({ circle: /Solan/i }).sort({createdAt:-1}).limit(1).toArray();
  console.log("Recent Inward with Solan:", JSON.stringify(inwards.map(i=>({ id: i._id, date: i.createdAt }))));

  await client.close();
}
run().catch(console.error);
