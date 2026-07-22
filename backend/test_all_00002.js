const { MongoClient } = require('mongodb');
async function run() {
  const uri = "mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0";
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('test');
  
  const collections = await db.listCollections().toArray();
  for (const c of collections) {
    const col = db.collection(c.name);
    // find any document that contains 00002 in any string field
    const docs = await col.find({
      $or: [
        { invoiceNumber: /00002/i },
        { purchaseOrderNumber: /00002/i },
        { requisitionNumber: /00002/i },
        { poNumber: /00002/i },
        { diNumber: /00002/i },
        { invoiceNo: /00002/i }
      ]
    }).toArray();
    if (docs.length > 0) {
      console.log(`Found 00002 in ${c.name}`);
    }
  }

  await client.close();
}
run().catch(console.error);
