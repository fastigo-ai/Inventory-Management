require('dotenv').config();
const { MongoClient } = require('mongodb');

async function run() {
  const uri = process.env.MONGO_URI;
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('test'); // Check if it's test or inventory based on standard mongoose connection. Usually it defaults to test if not specified.
  
  // Actually, wait, let's use the mongoose connection string parsing or just 'inventory' as the DB since it's an inventory management system. Let's list DBs.
  const dbs = await client.db().admin().listDatabases();
  const dbName = dbs.databases.find(d => d.name === 'inventory' || d.name === 'test' || d.name === 'Inventory').name || 'test';
  const targetDb = client.db(dbName);
  
  const items = await targetDb.collection('items').find({
    $or: [
      { sku: '29' },
      { 'dynamicData.loaSerialNo': '29' },
      { 'dynamicData.sku': '29' }
    ]
  }).toArray();
  
  console.log(`Using database: ${dbName}`);
  console.log(`Found ${items.length} items for LOA 29.`);
  
  const itemIds = items.map(i => i._id);

  const returns = await targetDb.collection('contractorreturns').find({
    status: { $ne: 'Cancelled' }
  }).toArray();

  let totalReturned = 0;
  
  returns.forEach(r => {
    (r.lineItems || r.items || []).forEach(li => {
      const isMatch = itemIds.some(id => id.toString() === li.itemId?.toString()) || 
                      li.sku === '29' || 
                      li.loaSerialNo === '29' ||
                      li.tempCode === '29'; // wait, LOA 29.
      if (isMatch) {
        const qty = Number(li.quantity || 0);
        totalReturned += qty;
        console.log(`Matched Return in ${r.returnChallanNo} - Qty: ${qty}`);
      }
    });
  });

  console.log(`\nTotal Returned for LOA 29: ${totalReturned}`);
  
  await client.close();
}

run().catch(console.error);
