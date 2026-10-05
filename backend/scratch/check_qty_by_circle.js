const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const MONGO_URI = process.env.MONGO_URI;

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;
    
    // 1. Find the Item
    const items = await db.collection('items').find({ 'dynamicData.tempCode': '1' }).toArray();
    const item = items.find(i => String(i.dynamicData?.itemName || i.itemName).toUpperCase().includes('STP')) || items[0];
    const itemId = item._id;
    console.log(`Found Item: ${item.dynamicData?.itemName || item.itemName} (ID: ${itemId})\n`);

    // 2. Aggregate all DIs for this item
    const dis = await db.collection('dis').find({ 'lineItems.itemId': itemId }).toArray();
    
    const circleTotals = {};
    let totalOverall = 0;
    
    dis.forEach(di => {
      if (di.lineItems) {
        di.lineItems.forEach(li => {
          if (String(li.itemId) === String(itemId)) {
            const circle = String(li.circle || 'UNKNOWN').trim();
            const qty = Number(li.allocatedQty || li.quantity || 0);
            
            if (!circleTotals[circle]) circleTotals[circle] = 0;
            circleTotals[circle] += qty;
            totalOverall += qty;
          }
        });
      }
    });
    
    console.log(`--- DI QUANTITIES BY CIRCLE ---`);
    for (const [circle, qty] of Object.entries(circleTotals)) {
      console.log(`- ${circle}: ${qty}`);
    }
    console.log(`\nTOTAL ACROSS ALL CIRCLES: ${totalOverall}`);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
