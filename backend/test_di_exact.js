const { MongoClient, ObjectId } = require('mongodb');
async function run() {
  const uri = "mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0";
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('test');
  
  const di = await db.collection('dis').findOne({ _id: new ObjectId('6a60afabe1b83672b364efb8') });
  console.log("ROOT:");
  console.log("package:", JSON.stringify(di.package));
  console.log("circle:", JSON.stringify(di.circle));
  
  await client.close();
}
run().catch(console.error);
