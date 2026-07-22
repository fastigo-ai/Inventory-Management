const { MongoClient } = require('mongodb');
async function run() {
  const uri = "mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0";
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('test');
  
  const collections = await db.listCollections().toArray();
  for (const c of collections) {
    const col = db.collection(c.name);
    // Find anywhere PR-00002 appears in any string field
    const docs = await col.find({
      $or: [
        { invoiceNumber: /PR-00002/i },
        { purchaseOrderNumber: /PR-00002/i },
        { requisitionNumber: /PR-00002/i },
        { 'lineItems.prNumber': /PR-00002/i },
        { poNumber: /PR-00002/i }
      ]
    }).toArray();
    if (docs.length > 0) {
      console.log(`Found PR-00002 in collection ${c.name}`);
    }
  }

  await client.close();
}
run().catch(console.error);
