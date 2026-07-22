const { MongoClient } = require('mongodb');
async function run() {
  const uri = "mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0";
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('test');
  
  const pis = await db.collection('purchaseinvoices').find().sort({createdAt:-1}).limit(5).toArray();
  console.log("Recent Invoices:");
  pis.forEach(pi => {
    console.log(`Invoice: ${pi.invoiceNumber}, Vendor: ${pi.vendorName}, Date: ${pi.createdAt}`);
    if (pi.lineItems) {
      pi.lineItems.forEach(li => {
        console.log(` - Item: ${li.itemName}, Circle: ${li.circle}, Pkg: ${li.package}`);
      });
    }
  });

  await client.close();
}
run().catch(console.error);
