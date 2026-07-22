const { MongoClient } = require('mongodb');
async function run() {
  const uri = "mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0";
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('test');
  
  const pis = await db.collection('purchaseinvoices').find().sort({_id: -1}).limit(2).toArray();
  for (const p of pis) {
    console.log(`PI: ${p.invoiceNumber} - items:`, p.lineItems.map(i => i.circle));
  }

  await client.close();
}
run().catch(console.error);
