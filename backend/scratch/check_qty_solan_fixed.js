const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;
    
    // Find ALL items matching STP 9 MTR and Circle Solan
    const items = await db.collection('items').find({ 
      $or: [
        { itemName: { $regex: /STP 9 MTR/i } },
        { 'dynamicData.itemName': { $regex: /STP 9 MTR/i } }
      ]
    }).toArray();
    
    const solanItemIds = items.filter(i => (i.dynamicData?.circle || i.circle) === 'Solan').map(i => i._id.toString());
    console.log(`Found ${solanItemIds.length} STP 9 MTR items for Solan.`);
    
    // Sum DI Qty for these item IDs
    const dis = await db.collection('dis').find({ 'lineItems.itemId': { $in: solanItemIds.map(id => new mongoose.Types.ObjectId(id)) } }).toArray();
    
    let totalDiQty = 0;
    dis.forEach(di => {
      di.lineItems.forEach(li => {
        if (solanItemIds.includes(li.itemId.toString())) {
          totalDiQty += Number(li.allocatedQty || li.quantity || 0);
        }
      });
    });
    
    console.log(`Total DI Qty for Solan items: ${totalDiQty}`);
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
