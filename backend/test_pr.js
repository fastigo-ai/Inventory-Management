const { MongoClient } = require('mongodb');
async function run() {
  const uri = "mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0";
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('test');
  
  const pi = await db.collection('purchaseinvoices').findOne({ invoiceNumber: /PR-00002/i });
  console.log("PI:", pi);

  const req = await db.collection('purchaserequisitions').findOne({ requisitionNumber: /PR-00002/i });
  console.log("Requisition:", req);

  const po = await db.collection('purchaseorders').findOne({ purchaseOrderNumber: /PR-00002/i });
  console.log("PO:", po);

  const inward = await db.collection('storeinwardentries').findOne({ invoiceNumber: /PR-00002/i });
  console.log("Inward PI Number:", inward);

  await client.close();
}
run().catch(console.error);
