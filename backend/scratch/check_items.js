const { MongoClient } = require('mongodb');

async function run() {
  const client = new MongoClient('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  try {
    await client.connect();
    const db = client.db('test');
    
    let items = await db.collection('items').find({
      'dynamicData.name': { $regex: /stp/i }
    }).toArray();
    
    if (items.length === 0) {
      const db2 = client.db('inventory-management');
      items = await db2.collection('items').find({
         $or: [
           { 'dynamicData.name': { $regex: /stp/i } },
           { 'name': { $regex: /stp/i } }
         ]
      }).toArray();
    }
    
    let res = [];
    for (const item of items) {
      res.push({
        name: item.dynamicData?.name || item.name,
        loa: item.dynamicData?.loaSerialNo || item.sku,
        tempCode: item.dynamicData?.tempCode,
        circle: item.dynamicData?.circle || item.circle,
        package: item.dynamicData?.package || item.package,
      });
    }
    console.table(res);
  } finally {
    await client.close();
  }
}
run().catch(console.dir);
