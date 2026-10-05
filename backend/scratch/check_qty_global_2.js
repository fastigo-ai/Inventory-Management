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

    // 3. Check all IRs for this item
    const irs = await db.collection('storeinwardentries').find({ itemId }).toArray();
    
    let totalIrQty = 0;
    console.log(`Found ${irs.length} IRs for this item.`);
    irs.forEach(ir => {
      console.log(`- IR: Circle=${ir.circle}, totalQty=${ir.totalQty}, challanQty=${ir.challanQty}, act=${ir.act}, poNumber=${ir.poNumber}`);
      totalIrQty += Number(ir.totalQty || ir.challanQty || ir.act || 0);
    });
    
    console.log(`Total IR Qty (Anywhere): ${totalIrQty}`);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
