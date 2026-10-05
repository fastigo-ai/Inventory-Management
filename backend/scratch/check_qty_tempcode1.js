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
    if (items.length === 0) {
      console.log("Item with tempCode '1' not found.");
      process.exit(1);
    }
    
    // Pick the one that matches STP 9 MTR
    const item = items.find(i => String(i.dynamicData?.itemName || i.itemName).toUpperCase().includes('STP')) || items[0];
    const itemId = item._id;
    console.log(`Found Item: ${item.dynamicData?.itemName || item.itemName} (ID: ${itemId})`);

    const SUB_STORE_MAP = {
      'Solan': ['Solan', 'Kumarhatti', 'Nalagarh'],
      'Nahan': ['Nahan'],
      'Rohru': ['Rohru'],
      'Rampur': ['Rampur'],
    };
    
    const solanCircles = SUB_STORE_MAP['Solan'].map(c => new RegExp(`^${c}$`, 'i'));

    // 2. Calculate DI Qty for Solan
    // DI items have circle in lineItems[].circle
    const dis = await db.collection('dis').find({ 'lineItems.itemId': itemId }).toArray();
    let totalDiQty = 0;
    
    dis.forEach(di => {
      if (di.lineItems) {
        di.lineItems.forEach(li => {
          if (String(li.itemId) === String(itemId)) {
            const circle = String(li.circle || '').toLowerCase();
            if (SUB_STORE_MAP['Solan'].map(c => c.toLowerCase()).includes(circle)) {
              totalDiQty += Number(li.allocatedQty || li.quantity || 0);
            }
          }
        });
      }
    });
    
    console.log(`\nTotal DI Qty for Solan: ${totalDiQty}`);

    // 3. Calculate IR Qty for Solan
    const irs = await db.collection('storeinwardentries').find({ 
      itemId, 
      circle: { $in: solanCircles } 
    }).toArray();
    
    let totalIrQty = 0;
    irs.forEach(ir => {
      totalIrQty += Number(ir.acceptedQty || 0);
    });
    
    console.log(`Total IR (Store Inward) Qty for Solan: ${totalIrQty}`);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
