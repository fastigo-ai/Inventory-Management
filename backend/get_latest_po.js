require('dotenv').config();
const { MongoClient } = require('mongodb');
async function run() {
  const client = new MongoClient(process.env.MONGO_URI);
  try {
    await client.connect();
    const db = client.db();
    const collection = db.collection('purchaseorders');
    const po = await collection.find({}).sort({ createdAt: -1 }).limit(1).toArray();
    console.log(JSON.stringify(po[0], null, 2));
  } finally {
    await client.close();
    process.exit(0);
  }
}
run().catch(console.error);
