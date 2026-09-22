const { MongoClient } = require('mongodb');

async function run() {
  const client = new MongoClient('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  try {
    await client.connect();
    const db = client.db('test');
    
    let item = await db.collection('items').findOne({
      $or: [
        { 'dynamicData.loaSerialNo': '426' },
        { 'dynamicData.loaSrNo': '426' },
        { 'sku': '426' }
      ]
    });
    
    if (!item) {
      const db2 = client.db('inventory-management');
      item = await db2.collection('items').findOne({
        $or: [
          { 'dynamicData.loaSerialNo': '426' },
          { 'dynamicData.loaSrNo': '426' },
          { 'sku': '426' }
        ]
      });
    }
    
    console.log(item);
  } finally {
    await client.close();
  }
}
run().catch(console.dir);
