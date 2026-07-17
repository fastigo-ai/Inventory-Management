require('dotenv').config();
const { MongoClient } = require('mongodb');
async function run() {
  const client = new MongoClient(process.env.MONGO_URI);
  try {
    await client.connect();
    const db = client.db();
    const collection = db.collection('purchaseorders');
    await collection.updateOne(
      { purchaseOrderNumber: 'PO-07759' },
      { $set: { cgstPercentage: 9, sgstPercentage: 9, igstPercentage: 0, total: 118 } }
    );
    console.log('Updated PO-07759');
  } finally {
    await client.close();
    process.exit(0);
  }
}
run().catch(console.error);
