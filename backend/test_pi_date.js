const { MongoClient } = require('mongodb');
async function run() {
  const uri = "mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0";
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('test');
  
  const pis = await db.collection('purchaseinvoices').find({ createdAt: { $gt: new Date('2026-07-22T00:00:00.000Z') } }).toArray();
  console.log("PIs on July 22:", pis.length);
  
  const dis = await db.collection('dis').find({ createdAt: { $gt: new Date('2026-07-22T00:00:00.000Z') } }).toArray();
  console.log("DIs on July 22:", dis.length);
  if(dis.length) console.log("DI detail:", dis[0]._id, dis[0].createdAt, JSON.stringify(dis[0].lineItems));

  await client.close();
}
run().catch(console.error);
