const { MongoClient } = require('mongodb');

async function run() {
  const client = new MongoClient('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  try {
    await client.connect();
    const db = client.db('test');
    
    let returns = await db.collection('contractorreturns').find({
      $or: [{ circle: /Rohru/i }, { location: /Rohru/i }, { 'lineItems.circle': /Rohru/i }]
    }).toArray();
    
    if (returns.length === 0) {
      const db2 = client.db('inventory-management');
      returns = await db2.collection('contractorreturns').find({
        $or: [{ circle: /Rohru/i }, { location: /Rohru/i }, { 'lineItems.circle': /Rohru/i }]
      }).toArray();
    }
    
    let totals = {};
    for (const a of returns) {
      if (!a.lineItems) continue;
      for (const item of a.lineItems) {
        if (item.itemName && item.itemName.toLowerCase().includes('9')) {
          const qty = Number(item.quantity || item.demandQty || item.returnQty || 0);
          totals[item.itemName] = (totals[item.itemName] || 0) + qty;
        }
      }
    }
    console.log('Returns:', totals);
  } finally {
    await client.close();
  }
}
run().catch(console.dir);
