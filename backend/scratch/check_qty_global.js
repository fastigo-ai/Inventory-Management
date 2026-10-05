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
    console.log(`Found Item: ${item.dynamicData?.itemName || item.itemName} (ID: ${itemId})`);

    // 2. Check all DIs for this item
    const dis = await db.collection('dis').find({ 'lineItems.itemId': itemId }).toArray();
    let totalDiQty = 0;
    
    console.log(`Found ${dis.length} DIs containing this item.`);
    dis.forEach(di => {
      if (di.lineItems) {
        di.lineItems.forEach(li => {
          if (String(li.itemId) === String(itemId)) {
            console.log(`- DI ${di.diNumber}: Circle=${li.circle}, Qty=${li.allocatedQty || li.quantity}`);
            totalDiQty += Number(li.allocatedQty || li.quantity || 0);
          }
        });
      }
    });
    
    console.log(`\nTotal DI Qty (Anywhere): ${totalDiQty}`);

    // 3. Check all IRs for this item
    const irs = await db.collection('storeinwardentries').find({ itemId }).toArray();
    
    let totalIrQty = 0;
    console.log(`Found ${irs.length} IRs for this item.`);
    irs.forEach(ir => {
      console.log(`- IR: Circle=${ir.circle}, Qty=${ir.acceptedQty}, diNo=${ir.diNumber || ir.diId}`);
      totalIrQty += Number(ir.acceptedQty || 0);
    });
    
    console.log(`Total IR Qty (Anywhere): ${totalIrQty}`);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
