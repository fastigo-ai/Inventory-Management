const { MongoClient } = require('mongodb');

async function run() {
  const client = new MongoClient('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  try {
    await client.connect();
    const db = client.db('test');
    
    let items = await db.collection('items').find({
      'dynamicData.loaSerialNo': '104'
    }).toArray();
    
    for (const item of items) {
      console.log(`Item: ${item.dynamicData?.name}, LOA: 104, Circle: ${item.dynamicData?.circle}`);
    }
  } finally {
    await client.close();
  }
}
run().catch(console.dir);
