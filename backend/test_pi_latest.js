const { MongoClient } = require('mongodb');
async function run() {
  const uri = "mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0";
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('test');
  
  const pis = await db.collection('purchaseinvoices').find().sort({_id: -1}).limit(5).toArray();
  console.log("5 latest PIs in db:", JSON.stringify(pis.map(p => ({
    id: p._id,
    invoiceNumber: p.invoiceNumber,
    date: p.createdAt
  })), null, 2));

  await client.close();
}
run().catch(console.error);
