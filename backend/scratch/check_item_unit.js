const { MongoClient } = require('mongodb');
async function run() {
  const client = new MongoClient('mongodb://localhost:27017');
  await client.connect();
  const db = client.db('erp');
  const item = await db.collection('items').findOne({ 'dynamicData.circle': 'Solan', 'dynamicData.tempCode': '5' });
  console.log("Item unit:", item ? item.unit : "Not found", "dynamicData unit:", item && item.dynamicData ? item.dynamicData.unit : "N/A");
  await client.close();
}
run();
