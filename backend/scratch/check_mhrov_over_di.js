const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const MONGO_URI = process.env.MONGO_URI;

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log(`Connected to database: ${mongoose.connection.name}`);
    const db = mongoose.connection.db;

    // We can query the DI collection to find any lineItems where mhrovDoneQty > quantity
    const overDis = await db.collection('dis').find({
      $expr: {
        $gt: [
          { $size: {
            $filter: {
              input: { $ifNull: ["$lineItems", []] },
              as: "item",
              cond: { $gt: [{ $ifNull: ["$$item.mhrovDoneQty", 0] }, { $ifNull: ["$$item.quantity", 0] }] }
            }
          }},
          0
        ]
      }
    }).toArray();

    if (overDis.length === 0) {
      console.log("Good news: No items currently have an MHROV quantity greater than the DI quantity.");
    } else {
      console.log(`Found ${overDis.length} DIs where the total received MHROV quantity exceeds the DI quantity.`);
      let totalOverItems = 0;
      
      overDis.forEach(di => {
        const overItems = (di.lineItems || []).filter(item => (item.mhrovDoneQty || 0) > (item.quantity || 0));
        totalOverItems += overItems.length;
        console.log(`\nDI: ${di.diNumber} (${overItems.length} items over quantity)`);
        overItems.forEach(item => {
           console.log(`  - Item: ${item.itemName} | Circle: ${item.circle || 'N/A'} | LOA: ${item.loaSerialNo || 'N/A'} | DI Qty: ${item.quantity} | Total MHROV Qty: ${item.mhrovDoneQty}`);
        });
      });
      console.log(`\nTotal items across all DIs exceeding quantity: ${totalOverItems}`);
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
