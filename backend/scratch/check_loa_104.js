const { MongoClient } = require('mongodb');

async function run() {
  const client = new MongoClient('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  try {
    await client.connect();
    const db = client.db('test');
    
    let item = await db.collection('items').findOne({
      'dynamicData.loaSerialNo': '104'
    });
    console.log(`LOA 104 Item ID: ${item._id}`);
    
    let min1 = await db.collection('contractorassignments').findOne({ assignmentNumber: '1', circle: /ROHRU/i });
    
    let found = false;
    for (const line of min1.lineItems) {
      if (line.itemId && line.itemId.toString() === item._id.toString()) {
        console.log(`MIN 1 has line item with ID ${item._id}! Name: ${line.itemName}, Qty: ${line.quantity}`);
        found = true;
      }
    }
    if (!found) console.log("MIN 1 does not have LOA 104's item ID.");
  } finally {
    await client.close();
  }
}
run().catch(console.dir);
