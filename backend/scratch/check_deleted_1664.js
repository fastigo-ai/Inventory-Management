const { MongoClient } = require('mongodb');

async function run() {
  const client = new MongoClient('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  try {
    await client.connect();
    const db = client.db('test');
    
    let item = await db.collection('items').findOne({
      $or: [
        { 'dynamicData.loaSerialNo': '1664' },
        { 'dynamicData.loaSrNo': '1664' },
        { 'sku': '1664' }
      ],
      'dynamicData.circle': /Rohru/i
    });
    
    if (!item) {
      const db2 = client.db('inventory-management');
      item = await db2.collection('items').findOne({
        $or: [
          { 'dynamicData.loaSerialNo': '1664' },
          { 'dynamicData.loaSrNo': '1664' },
          { 'sku': '1664' }
        ],
        'dynamicData.circle': /Rohru/i
      });
    }
    
    console.log(item);
  } finally {
    await client.close();
  }
}
run().catch(console.dir);
