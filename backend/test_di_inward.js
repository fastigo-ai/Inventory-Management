const { MongoClient, ObjectId } = require('mongodb');
async function run() {
  const uri = "mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0";
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('test');
  
  const entries = await db.collection('storeinwardentries').find({ diId: new ObjectId('6a60afabe1b83672b364efb8') }).toArray();
  console.log("Inward entries for DI:", entries.length);
  
  await client.close();
}
run().catch(console.error);
